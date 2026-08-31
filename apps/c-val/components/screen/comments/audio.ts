"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  cValCommentCensorDelayPlaybackSeconds,
  cValCommentCensorBeepFrequencyHz,
  cValCommentEffectivePlaybackRate,
  type CValCommentCorpus,
  type CValCommentCorpusEntry,
} from "./presenter";
import {
  C_VAL_COMMENT_BEEP_FADE_SECONDS,
  C_VAL_COMMENT_BEEP_FINAL_FREQUENCY_RATIO,
  C_VAL_COMMENT_BEEP_GAIN_SCALE,
} from "../comment-beep";

type AudioRequest = {
  entry: CValCommentCorpusEntry;
  beep: CValCommentCorpus["beep"];
  censorEnabled: boolean;
  playbackRate: number;
  detuneCents: number;
  shouldPlay?: () => boolean;
  playbackPolicy?: () => {
    gain: number;
  } | null;
  onEnded?: () => void;
};

const MAXIMUM_CONCURRENT_SPEECH_SOURCES = 6;
// Temporary density control for the comments sound field.
const C_VAL_COMMENT_AUDIO_PLAY_PROBABILITY = 0.5;

function reserveSpeechSource(
  activeSources: Set<AudioBufferSourceNode>,
  source: AudioBufferSourceNode,
) {
  while (activeSources.size >= MAXIMUM_CONCURRENT_SPEECH_SOURCES) {
    const oldest = activeSources.values().next().value;
    if (!oldest) break;
    activeSources.delete(oldest);
    try {
      oldest.stop();
    } catch {}
  }
  activeSources.add(source);
}

export function useCValCommentAudio() {
  const maximumDecodedBuffers = 72;
  const contextRef = useRef<AudioContext | null>(null);
  const cacheRef = useRef(new Map<string, Promise<AudioBuffer>>());
  const outputRef = useRef<DynamicsCompressorNode | null>(null);
  const pendingRef = useRef<AudioRequest | null>(null);
  const activeSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const disposedRef = useRef(false);

  const audioBufferFor = useCallback((context: AudioContext, src: string) => {
    const cached = cacheRef.current.get(src);
    if (cached) return cached;
    const request = fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load ${src}`);
        return response.arrayBuffer();
      })
      .then((buffer) => context.decodeAudioData(buffer))
      .catch((error) => {
        cacheRef.current.delete(src);
        throw error;
      });
    cacheRef.current.set(src, request);
    if (cacheRef.current.size > maximumDecodedBuffers) {
      const oldest = cacheRef.current.keys().next().value;
      if (oldest) cacheRef.current.delete(oldest);
    }
    return request;
  }, []);

  const liveContext = useCallback(() => {
    const current = contextRef.current;
    if (current && current.state !== "closed") return current;
    const next = new AudioContext();
    const output = next.createDynamicsCompressor();
    output.threshold.value = -18;
    output.knee.value = 12;
    output.ratio.value = 8;
    output.attack.value = 0.004;
    output.release.value = 0.18;
    output.connect(next.destination);
    contextRef.current = next;
    outputRef.current = output;
    return next;
  }, []);

  const playNow = useCallback(async (
    context: AudioContext,
    request: AudioRequest,
  ) => {
    try {
      if (request.shouldPlay && !request.shouldPlay()) {
        request.onEnded?.();
        return;
      }
      const buffer = await audioBufferFor(context, request.entry.src);
      if (disposedRef.current || (request.shouldPlay && !request.shouldPlay())) {
        request.onEnded?.();
        return;
      }
      const policy = request.playbackPolicy?.();
      if (request.playbackPolicy && !policy) {
        request.onEnded?.();
        return;
      }
      const source = context.createBufferSource();
      const speechGain = context.createGain();
      const sourceTime = context.currentTime + 0.02;
      const playbackRate = Math.max(0.25, request.playbackRate);
      const detuneCents = Math.max(-1_200, Math.min(1_200, request.detuneCents));
      const gain = Math.min(1, Math.max(0, policy?.gain ?? 1));
      const effectivePlaybackRate = cValCommentEffectivePlaybackRate(
        playbackRate,
        detuneCents,
      );
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(playbackRate, sourceTime);
      source.detune.setValueAtTime(detuneCents, sourceTime);
      const output = outputRef.current;
      if (!output) {
        request.onEnded?.();
        return;
      }
      source.connect(speechGain).connect(output);
      speechGain.gain.setValueAtTime(gain, sourceTime);

      const profanityStart = request.entry.profanityStart;
      const profanityEnd = request.entry.profanityEnd;
      const hasCensorInterval = request.censorEnabled
        && request.entry.profanityStatus === "present"
        && profanityStart !== null
        && profanityEnd !== null
        && profanityEnd > profanityStart;

      if (hasCensorInterval) {
        const beepPeakGain = request.beep.peakGain
          * C_VAL_COMMENT_BEEP_GAIN_SCALE
          * gain;
        const fade = Math.min(
          C_VAL_COMMENT_BEEP_FADE_SECONDS,
          Math.max(0, (profanityEnd - profanityStart) / 2),
        );
        const censorDelay = cValCommentCensorDelayPlaybackSeconds(effectivePlaybackRate);
        const muteStart = sourceTime + profanityStart / effectivePlaybackRate + censorDelay;
        const muteEnd = sourceTime + profanityEnd / effectivePlaybackRate + censorDelay;
        speechGain.gain.setValueAtTime(gain, Math.max(sourceTime, muteStart - fade));
        speechGain.gain.linearRampToValueAtTime(0, muteStart);
        speechGain.gain.setValueAtTime(0, muteEnd);
        speechGain.gain.linearRampToValueAtTime(gain, muteEnd + fade);

        const oscillator = context.createOscillator();
        const beepGain = context.createGain();
        const beepFrequency = cValCommentCensorBeepFrequencyHz(
          request.beep.frequencyHz,
          playbackRate,
          detuneCents,
        );
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(beepFrequency, muteStart);
        oscillator.frequency.exponentialRampToValueAtTime(
          beepFrequency * C_VAL_COMMENT_BEEP_FINAL_FREQUENCY_RATIO,
          muteEnd,
        );
        beepGain.gain.setValueAtTime(0, muteStart);
        beepGain.gain.linearRampToValueAtTime(
          beepPeakGain,
          muteStart + fade,
        );
        beepGain.gain.setValueAtTime(
          beepPeakGain,
          Math.max(muteStart + fade, muteEnd - fade),
        );
        beepGain.gain.linearRampToValueAtTime(0, muteEnd);
        oscillator.connect(beepGain).connect(output);
        oscillator.start(muteStart);
        oscillator.stop(muteEnd);
      }

      reserveSpeechSource(activeSourcesRef.current, source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        request.onEnded?.();
      };
      source.start(sourceTime);
    } catch {
      request.onEnded?.();
    }
  }, [audioBufferFor]);

  const speak = useCallback((request: AudioRequest) => {
    if (disposedRef.current) return;
    if (Math.random() >= C_VAL_COMMENT_AUDIO_PLAY_PROBABILITY) {
      request.onEnded?.();
      return;
    }
    const context = liveContext();
    if (context.state === "running") {
      void playNow(context, request);
      return;
    }
    pendingRef.current = request;
    void context.resume().then(() => {
      if (context.state !== "running" || contextRef.current !== context) return;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) void playNow(context, pending);
    }).catch(() => undefined);
  }, [liveContext, playNow]);

  const stop = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.onEnded?.();
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {}
    }
    activeSourcesRef.current.clear();
  }, []);

  const prime = useCallback((entries: readonly CValCommentCorpusEntry[]) => {
    if (disposedRef.current || entries.length === 0) return;
    const context = liveContext();
    for (const entry of entries) {
      void audioBufferFor(context, entry.src).catch(() => undefined);
    }
  }, [audioBufferFor, liveContext]);

  useEffect(() => {
    disposedRef.current = false;
    const decodedBuffers = cacheRef.current;
    const resume = () => {
      const context = liveContext();
      if (context.state === "suspended") {
        void context.resume().then(() => {
          if (context.state !== "running" || contextRef.current !== context) return;
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (pending) void playNow(context, pending);
        }).catch(() => undefined);
      }
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      disposedRef.current = true;
      pendingRef.current = null;
      activeSourcesRef.current.clear();
      const context = contextRef.current;
      contextRef.current = null;
      outputRef.current = null;
      decodedBuffers.clear();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    };
  }, [liveContext, playNow]);

  return { prime, speak, stop };
}
