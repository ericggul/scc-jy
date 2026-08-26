"use client";

import { useCallback, useEffect, useRef } from "react";
import { cValSocialAdmissionIntervalMs } from "../cadence";
import type { CValNewsEvent } from "./presenter";

// Set to false for a completely silent news wire without changing its timing.
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
 * heard. This gate follows the same market clock but never queues old hits.
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
  const direction = Math.sign(admission.oneSecondMovePercent);
  const root = admission.timing === "market" ? 92 : 82;
  const finalPitch = direction > 0 ? 1.13 : direction < 0 ? 0.87 : 1;
  const spacingSeconds = 0.046 - intensity * 0.022;
  const tailSeconds = 0.13 - intensity * 0.055;
  const masterGain = (0.018 + 0.048 * Math.sqrt(intensity))
    * (admission.timing === "market" ? 1 : 0.82);

  return {
    root,
    finalPitch,
    spacingSeconds,
    tailSeconds,
    masterGain,
  };
}

function schedulePulse(
  context: AudioContext,
  output: AudioNode,
  startAt: number,
  frequencyHz: number,
  gain: number,
  durationSeconds: number,
) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequencyHz, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(28, frequencyHz * 0.88),
    startAt + durationSeconds,
  );
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), startAt + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
  oscillator.connect(envelope).connect(output);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSeconds + 0.015);
}

/** A low, synthetic two-forebeat-and-landing-pulse news bed. */
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
    const offsets = [0, profile.spacingSeconds, profile.spacingSeconds * 2];
    const frequencies = [
      profile.root * 1.34,
      profile.root * 1.2,
      profile.root * profile.finalPitch,
    ];
    const gains = [0.48, 0.6, 1];
    for (let index = 0; index < offsets.length; index += 1) {
      schedulePulse(
        context,
        output,
        startAt + offsets[index]!,
        frequencies[index]!,
        profile.masterGain * gains[index]!,
        profile.tailSeconds,
      );
    }
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
