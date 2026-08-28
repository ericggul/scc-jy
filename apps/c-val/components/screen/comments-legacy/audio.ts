"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  CValCommentCorpus,
  CValCommentCorpusEntry,
} from "./presenter";
import {
  C_VAL_COMMENT_BEEP_FADE_SECONDS,
  C_VAL_COMMENT_BEEP_FINAL_FREQUENCY_RATIO,
  C_VAL_COMMENT_BEEP_GAIN_SCALE,
} from "../comment-beep";

type AudioRequest = {
  entry: CValCommentCorpusEntry;
  beep: CValCommentCorpus["beep"];
  playbackRate: number;
};

export function useCValCommentAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const cacheRef = useRef(new Map<string, Promise<AudioBuffer>>());
  const pendingRef = useRef<AudioRequest | null>(null);
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
    return request;
  }, []);

  const liveContext = useCallback(() => {
    const current = contextRef.current;
    if (current && current.state !== "closed") return current;
    const next = new AudioContext();
    contextRef.current = next;
    return next;
  }, []);

  const playNow = useCallback(async (
    context: AudioContext,
    request: AudioRequest,
  ) => {
    try {
      const buffer = await audioBufferFor(context, request.entry.src);
      if (disposedRef.current) return;
      const source = context.createBufferSource();
      const speechGain = context.createGain();
      const sourceTime = context.currentTime + 0.02;
      const playbackRate = Math.max(0.25, request.playbackRate);
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(playbackRate, sourceTime);
      source.connect(speechGain).connect(context.destination);
      speechGain.gain.setValueAtTime(1, sourceTime);

      const profanityStart = request.entry.profanityStart;
      const profanityEnd = request.entry.profanityEnd;
      const hasCensorInterval = request.entry.profanityStatus === "present"
        && profanityStart !== null
        && profanityEnd !== null
        && profanityEnd > profanityStart;

      if (hasCensorInterval) {
        const beepPeakGain = request.beep.peakGain * C_VAL_COMMENT_BEEP_GAIN_SCALE;
        const fade = Math.min(
          C_VAL_COMMENT_BEEP_FADE_SECONDS,
          Math.max(0, (profanityEnd - profanityStart) / 2),
        );
        const muteStart = sourceTime + profanityStart / playbackRate;
        const muteEnd = sourceTime + profanityEnd / playbackRate;
        speechGain.gain.setValueAtTime(1, Math.max(sourceTime, muteStart - fade));
        speechGain.gain.linearRampToValueAtTime(0, muteStart);
        speechGain.gain.setValueAtTime(0, muteEnd);
        speechGain.gain.linearRampToValueAtTime(1, muteEnd + fade);

        const oscillator = context.createOscillator();
        const beepGain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(request.beep.frequencyHz, muteStart);
        oscillator.frequency.exponentialRampToValueAtTime(
          request.beep.frequencyHz * C_VAL_COMMENT_BEEP_FINAL_FREQUENCY_RATIO,
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
        oscillator.connect(beepGain).connect(context.destination);
        oscillator.start(muteStart);
        oscillator.stop(muteEnd);
      }

      source.start(sourceTime);
    } catch {}
  }, [audioBufferFor]);

  const speak = useCallback((request: AudioRequest) => {
    if (disposedRef.current) return;
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

  useEffect(() => {
    disposedRef.current = false;
    const resume = () => {
      const context = contextRef.current;
      if (context?.state === "suspended") {
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
      const context = contextRef.current;
      contextRef.current = null;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    };
  }, [playNow]);

  return { speak };
}
