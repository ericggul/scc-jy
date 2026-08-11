#!/usr/bin/env python3
import argparse
import array
import json
import math
import os
from pathlib import Path
import tempfile
import wave

from mlx_whisper import transcribe
import numpy as np


ROOT = Path.cwd()
DEFAULT_RUNS = ["context-corpus-v1-cedar", "context-corpus-v1-marin"]
MODEL = "mlx-community/whisper-large-v3-turbo"
PROFANITY_VARIANTS = ("씨발", "시발", "씨팔", "시팔")
PADDING_SECONDS = 0.015
ENERGY_THRESHOLD_DBFS = -42.0
MAX_BATCH_FILES = 12
MAX_BATCH_SECONDS = 27.0
BATCH_GAP_SECONDS = 0.75
OVERRIDES_PATH = ROOT / "scripts/collections/c-val-profanity-timestamp-overrides.json"


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Extract local word timestamps for the C-VAL profanity corpus."
    )
    parser.add_argument("--runs", default=",".join(DEFAULT_RUNS))
    parser.add_argument("--limit", type=int)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def normalize_word(value):
    return "".join(character for character in value if character.isalnum()).lower()


def is_profanity(value):
    normalized = normalize_word(value)
    return any(variant in normalized for variant in PROFANITY_VARIANTS)


def flatten_words(result):
    return [
        word
        for segment in result.get("segments", [])
        for word in segment.get("words", [])
    ]


def expected_profanity_index(text):
    tokens = text.split()
    index = next((index for index, token in enumerate(tokens) if is_profanity(token)), -1)
    return index, len(tokens)


def choose_timestamp_word(words, source_file):
    matches = [(index, word) for index, word in enumerate(words) if is_profanity(word["word"])]
    if len(matches) == 1:
        index, word = matches[0]
        return index, word, "recognized-profanity"
    if len(matches) > 1:
        index, word = matches[-1] if source_file["profanityPosition"] == "final" else matches[0]
        return index, word, "recognized-profanity-position"
    if not words:
        raise RuntimeError("Transcription returned no word timestamps.")

    expected_index, expected_count = expected_profanity_index(source_file["text"])
    if source_file["profanityPosition"] == "initial":
        selected_index = 0
    elif source_file["profanityPosition"] == "final":
        selected_index = len(words) - 1
    elif expected_index >= 0 and expected_count > 1:
        selected_index = round((expected_index / (expected_count - 1)) * (len(words) - 1))
    else:
        selected_index = len(words) // 2
    return selected_index, words[selected_index], "declared-position-fallback"


def read_pcm16_mono(audio_path):
    with wave.open(str(audio_path), "rb") as source:
        if source.getsampwidth() != 2 or source.getnchannels() != 1:
            raise RuntimeError(f"Expected mono 16-bit PCM WAV: {audio_path}")
        sample_rate = source.getframerate()
        samples = array.array("h", source.readframes(source.getnframes()))
    if os.sys.byteorder != "little":
        samples.byteswap()
    return sample_rate, samples


def audio_duration(audio_path):
    with wave.open(str(audio_path), "rb") as source:
        return source.getnframes() / source.getframerate()


def pack_audio_batches(source_files, run_directory):
    batches = []
    current = []
    current_duration = 0.0
    for source_file in source_files:
        duration = audio_duration(run_directory / source_file["fileName"])
        added_duration = duration + (BATCH_GAP_SECONDS if current else 0.0)
        if current and (
            len(current) >= MAX_BATCH_FILES
            or current_duration + added_duration > MAX_BATCH_SECONDS
        ):
            batches.append(current)
            current = []
            current_duration = 0.0
            added_duration = duration
        current.append(source_file)
        current_duration += added_duration
    if current:
        batches.append(current)
    return batches


def combine_audio(source_files, run_directory):
    sample_rate = None
    pieces = []
    clips = []
    cursor_samples = 0
    for index, source_file in enumerate(source_files):
        audio_path = run_directory / source_file["fileName"]
        current_rate, pcm = read_pcm16_mono(audio_path)
        if sample_rate is None:
            sample_rate = current_rate
        if current_rate != sample_rate:
            raise RuntimeError("All batch WAV files must share one sample rate.")
        if index > 0:
            silence_samples = round(BATCH_GAP_SECONDS * sample_rate)
            pieces.append(np.zeros(silence_samples, dtype=np.float32))
            cursor_samples += silence_samples
        waveform = np.asarray(pcm, dtype=np.float32) / 32768.0
        start = cursor_samples / sample_rate
        pieces.append(waveform)
        cursor_samples += len(waveform)
        clips.append(
            {
                "sourceFile": source_file,
                "audioPath": audio_path,
                "offset": start,
                "duration": len(waveform) / sample_rate,
            }
        )
    return np.concatenate(pieces), clips


def refine_to_active_audio(audio_path, words, selected_index):
    sample_rate, samples = read_pcm16_mono(audio_path)
    duration = len(samples) / sample_rate
    selected = words[selected_index]
    raw_start = max(0.0, float(selected["start"]))
    raw_end = min(duration, float(selected["end"]))
    previous_end = float(words[selected_index - 1]["end"]) if selected_index > 0 else 0.0
    next_start = (
        float(words[selected_index + 1]["start"])
        if selected_index + 1 < len(words)
        else duration
    )
    window_start = max(0.0, (previous_end + raw_start) / 2 if selected_index > 0 else 0.0)
    window_end = min(
        duration,
        (raw_end + next_start) / 2 if selected_index + 1 < len(words) else duration,
    )

    frame_samples = max(1, round(sample_rate * 0.01))
    hop_samples = max(1, round(sample_rate * 0.005))
    threshold = 10 ** (ENERGY_THRESHOLD_DBFS / 20)
    first_active = None
    last_active = None
    first_sample = max(0, round(window_start * sample_rate))
    final_sample = min(len(samples), round(window_end * sample_rate))

    for frame_start in range(first_sample, final_sample, hop_samples):
        frame_end = min(final_sample, frame_start + frame_samples)
        if frame_end <= frame_start:
            continue
        square_sum = sum((sample / 32768.0) ** 2 for sample in samples[frame_start:frame_end])
        rms = math.sqrt(square_sum / (frame_end - frame_start))
        if rms >= threshold:
            if first_active is None:
                first_active = frame_start / sample_rate
            last_active = frame_end / sample_rate

    if first_active is None or last_active is None:
        return raw_start, raw_end, duration, "whisper-only"
    return first_active, last_active, duration, "whisper-plus-energy"


def write_json_atomic(target_path, value):
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=target_path.parent, delete=False
    ) as temporary:
        json.dump(value, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(target_path)


def process_run(run_name, limit, overwrite):
    run_directory = ROOT / "public/audio/c-val/exclamations/runs" / run_name
    source_manifest_path = run_directory / "manifest.json"
    output_path = run_directory / "profanity-timestamps.json"
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    all_overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    run_overrides = all_overrides.get(run_name, {})

    previous = None
    if output_path.exists() and not overwrite:
        previous = json.loads(output_path.read_text(encoding="utf-8"))
        if previous.get("alignmentModel") != MODEL or previous.get("alignmentRuntime") != "local-mlx":
            previous = None

    completed_by_name = {
        item["fileName"]: item for item in (previous or {}).get("files", [])
    }
    for item in completed_by_name.values():
        item.setdefault("profanityStatus", "present")
        item.setdefault("overrideReason", None)
    pending = [
        item
        for item in source_manifest["files"]
        if item["fileName"] not in completed_by_name
        or completed_by_name[item["fileName"]]["selectionMethod"]
        == "declared-position-fallback"
    ]
    if limit is not None:
        pending = pending[:limit]
    errors = []

    def checkpoint(status):
        files = [
            completed_by_name[item["fileName"]]
            for item in source_manifest["files"]
            if item["fileName"] in completed_by_name
        ]
        write_json_atomic(
            output_path,
            {
                "schemaVersion": 1,
                "status": status,
                "sourceRun": run_name,
                "sourceManifest": f"/audio/c-val/exclamations/runs/{run_name}/manifest.json",
                "alignmentRuntime": "local-mlx",
                "alignmentModel": MODEL,
                "paddingSeconds": PADDING_SECONDS,
                "energyThresholdDbfs": ENERGY_THRESHOLD_DBFS,
                "alignmentBatchMaxFiles": MAX_BATCH_FILES,
                "alignmentBatchGapSeconds": BATCH_GAP_SECONDS,
                "expectedFiles": len(source_manifest["files"]),
                "completedFiles": len(files),
                "fallbackFiles": sum(
                    item["selectionMethod"] == "declared-position-fallback" for item in files
                ),
                "auditedOverrideFiles": sum(
                    item["selectionMethod"] == "audited-waveform-override" for item in files
                ),
                "missingProfanityFiles": sum(
                    item.get("profanityStatus") == "missing-in-source-audio" for item in files
                ),
                "errors": errors,
                "files": files,
            },
        )

    checkpoint("in-progress")
    for batch in pack_audio_batches(pending, run_directory):
        try:
            combined_audio, clips = combine_audio(batch, run_directory)
            result = transcribe(
                combined_audio,
                path_or_hf_repo=MODEL,
                language="ko",
                initial_prompt=" ".join(source_file["text"] for source_file in batch),
                word_timestamps=True,
                temperature=0,
                verbose=None,
            )
            combined_words = flatten_words(result)
        except Exception as error:
            for source_file in batch:
                errors.append({"fileName": source_file["fileName"], "error": str(error)})
            checkpoint("in-progress")
            print(f"{run_name}: {len(completed_by_name)}/{len(source_manifest['files'])}", flush=True)
            continue

        for clip in clips:
            source_file = clip["sourceFile"]
            try:
                source_file = clip["sourceFile"]
                clip_start = clip["offset"]
                clip_end = clip_start + clip["duration"]
                words = []
                for word in combined_words:
                    midpoint = (float(word["start"]) + float(word["end"])) / 2
                    if clip_start <= midpoint <= clip_end:
                        words.append(
                            {
                                **word,
                                "start": max(0.0, float(word["start"]) - clip_start),
                                "end": min(clip["duration"], float(word["end"]) - clip_start),
                            }
                        )
                if words:
                    selected_index, selected, selection_method = choose_timestamp_word(
                        words, source_file
                    )
                else:
                    selection_method = "declared-position-fallback"
                override = run_overrides.get(source_file["fileName"])
                if selection_method == "declared-position-fallback" and override is None:
                    individual_result = transcribe(
                        str(clip["audioPath"]),
                        path_or_hf_repo=MODEL,
                        language="ko",
                        initial_prompt=source_file["text"],
                        word_timestamps=True,
                        temperature=0,
                        verbose=None,
                    )
                    individual_words = flatten_words(individual_result)
                    individual_selection = choose_timestamp_word(individual_words, source_file)
                    words = individual_words
                    selected_index, selected, selection_method = individual_selection
                if override is not None:
                    duration = clip["duration"]
                    selection_method = "audited-waveform-override"
                    refinement_method = "audited-waveform"
                    if override["status"] == "present":
                        active_start = override["activeStart"]
                        active_end = override["activeEnd"]
                        start = max(0.0, active_start - PADDING_SECONDS)
                        end = min(duration, active_end + PADDING_SECONDS)
                    else:
                        active_start = None
                        active_end = None
                        start = None
                        end = None
                else:
                    active_start, active_end, duration, refinement_method = refine_to_active_audio(
                        clip["audioPath"], words, selected_index
                    )
                    start = max(0.0, active_start - PADDING_SECONDS)
                    end = min(duration, active_end + PADDING_SECONDS)
                if start is not None and not 0 <= start < end <= duration + 1e-9:
                    raise RuntimeError(f"Invalid final interval: {start}–{end} / {duration}")
                completed_by_name[source_file["fileName"]] = {
                    "fileName": source_file["fileName"],
                    "id": source_file["id"],
                    "src": source_file["src"],
                    "text": source_file["text"],
                    "profanityPosition": source_file["profanityPosition"],
                    "transcript": "".join(word["word"] for word in words).strip(),
                    "recognizedWords": words,
                    "profanityStatus": override["status"] if override else "present",
                    "matchedWord": selected["word"].strip() if words else None,
                    "selectionMethod": selection_method,
                    "refinementMethod": refinement_method,
                    "overrideReason": override.get("reason") if override else None,
                    "rawStart": float(selected["start"]) if words else None,
                    "rawEnd": float(selected["end"]) if words else None,
                    "activeStart": active_start,
                    "activeEnd": active_end,
                    "start": start,
                    "end": end,
                    "duration": duration,
                    "sourceBytes": clip["audioPath"].stat().st_size,
                }
            except Exception as error:
                errors.append({"fileName": source_file["fileName"], "error": str(error)})

        checkpoint("in-progress")
        print(f"{run_name}: {len(completed_by_name)}/{len(source_manifest['files'])}", flush=True)

    complete = len(completed_by_name) == len(source_manifest["files"]) and not errors
    checkpoint("complete" if complete else "incomplete")
    return {
        "runName": run_name,
        "complete": complete,
        "completed": len(completed_by_name),
        "expected": len(source_manifest["files"]),
        "errors": errors,
    }


def main():
    arguments = parse_arguments()
    if arguments.limit is not None and arguments.limit < 1:
        raise ValueError("--limit must be positive.")
    summaries = [
        process_run(run_name, arguments.limit, arguments.overwrite)
        for run_name in filter(None, arguments.runs.split(","))
    ]
    print(json.dumps(summaries, ensure_ascii=False, indent=2), flush=True)
    if arguments.limit is None and any(not summary["complete"] for summary in summaries):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
