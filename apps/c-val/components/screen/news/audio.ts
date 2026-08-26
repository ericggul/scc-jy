"use client";

import { useCallback, useEffect, useRef } from "react";
import { cValSocialAdmissionIntervalMs } from "../cadence";
import type { CValNewsEvent } from "./presenter";

export const C_VAL_NEWS_ADMISSION_AUDIO_ENABLED = true;
const C_VAL_NEWS_AUDIO_FASTEST_GAP_MS = 60;

export type CValNewsAudioAdmission = {
  event: CValNewsEvent;
  timing: "market" | "society";
  oneSecondMovePercent: number;
  phase: "waiting" | "active" | "closing-auction";
};

function finiteMagnitude(value: number) {
  return Math.max(0, Math.abs(Number.isFinite(value) ? value : 0));
}

/**
 * The news wire may admit rows faster than a short three-pulse phrase can be
 * heard. This gate follows the same market clock but never queues old hits:
 * a later admission simply replaces a missed one with the current intensity.
 */
export function cValNewsAudioMinimumGapMs(oneSecondMovePercent: number) {
  return Math.max(
    C_VAL_NEWS_AUDIO_FASTEST_GAP_MS,
    cValSocialAdmissionIntervalMs(oneSecondMovePercent),
  );
}

function newsAudioProfile(admission: CValNewsAudioAdmission) {
  const magnitude = finiteMagnitude(admission.oneSecondMovePercent);
  const intensity = Math.min(1, magnitude / 30);
  const spacingSeconds = 0.115 - intensity * 0.05;
  const firstDurationSeconds = 0.19 - intensity * 0.08;
  const secondDurationSeconds = 0.27 - intensity * 0.11;
  const masterGain = 0.02 + 0.032 * Math.sqrt(intensity);

  return {
    spacingSeconds,
    firstDurationSeconds,
    secondDurationSeconds,
    masterGain,
  };
}

function scheduleChime(
  context: AudioContext,
  output: AudioNode,
  startAt: number,
  frequencyHz: number,
  gain: number,
  durationSeconds: number,
) {
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), startAt + 0.016);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
  envelope.connect(output);

  for (const partial of [
    { ratio: 1, gain: 0.8 },
    { ratio: 2, gain: 0.12 },
  ]) {
    const oscillator = context.createOscillator();
    const partialGain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequencyHz * partial.ratio, startAt);
    partialGain.gain.setValueAtTime(partial.gain, startAt);
    oscillator.connect(partialGain).connect(envelope);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationSeconds + 0.015);
  }
}

/**
 * A restrained two-note broadcast cue. Both notes belong to the same perfect
 * fifth, so rapid alerts overlap as one consonant signal rather than clashing.
 */
export function useCValNewsAdmissionAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const outputRef = useRef<DynamicsCompressorNode | null>(null);
  const nextPulseAtRef = useRef(0);
  const disposedRef = useRef(false);

  const liveContext = useCallback(() => {
    const current = contextRef.current;
    if (current && current.state !== "closed") return current;

    const context = new AudioContext();
    const output = context.createDynamicsCompressor();
    output.threshold.value = -30;
    output.knee.value = 14;
    output.ratio.value = 10;
    output.attack.value = 0.003;
    output.release.value = 0.16;
    output.connect(context.destination);
    contextRef.current = context;
    outputRef.current = output;
    return context;
  }, []);

  const playAdmission = useCallback((admission: CValNewsAudioAdmission) => {
    if (
      disposedRef.current
      || !C_VAL_NEWS_ADMISSION_AUDIO_ENABLED
      || admission.phase !== "active"
    ) return;

    const now = performance.now();
    const minimumGap = cValNewsAudioMinimumGapMs(admission.oneSecondMovePercent);
    if (now < nextPulseAtRef.current) return;
    nextPulseAtRef.current = now + minimumGap;

    const context = liveContext();
    const output = outputRef.current;
    if (context.state !== "running" || !output) return;

    const profile = newsAudioProfile(admission);
    const startAt = context.currentTime + 0.01;
    scheduleChime(
      context,
      output,
      startAt,
      493.88,
      profile.masterGain * 0.56,
      profile.firstDurationSeconds,
    );
    scheduleChime(
      context,
      output,
      startAt + profile.spacingSeconds,
      739.99,
      profile.masterGain,
      profile.secondDurationSeconds,
    );
  }, [liveContext]);

  useEffect(() => {
    disposedRef.current = false;
    const resume = () => {
      const context = liveContext();
      if (context.state === "suspended") void context.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      disposedRef.current = true;
      const context = contextRef.current;
      contextRef.current = null;
      outputRef.current = null;
      nextPulseAtRef.current = 0;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    };
  }, [liveContext]);

  return { playAdmission };
}
