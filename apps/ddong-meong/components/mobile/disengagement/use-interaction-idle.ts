"use client";

import { useCallback, useEffect, useRef } from "react";

export const directInputIdleMs = 60_000;

type InteractionIdleOptions = {
  enabled: boolean;
  onActive: () => void;
  onIdle: () => void;
  paused: boolean;
};

export function useInteractionIdle({
  enabled,
  onActive,
  onIdle,
  paused,
}: InteractionIdleOptions) {
  const callbacksRef = useRef({ onActive, onIdle });
  const hasDirectInputRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    callbacksRef.current = { onActive, onIdle };
  }, [onActive, onIdle]);

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const scheduleIdleTimer = useCallback(() => {
    clearIdleTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      callbacksRef.current.onIdle();
    }, directInputIdleMs);
  }, [clearIdleTimer]);

  useEffect(() => {
    clearIdleTimer();
    if (!enabled) {
      hasDirectInputRef.current = false;
      return;
    }

    if (!paused && hasDirectInputRef.current) scheduleIdleTimer();
    return clearIdleTimer;
  }, [clearIdleTimer, enabled, paused, scheduleIdleTimer]);

  return useCallback(() => {
    if (!enabled || paused) return;

    hasDirectInputRef.current = true;
    callbacksRef.current.onActive();
    scheduleIdleTimer();
  }, [enabled, paused, scheduleIdleTimer]);
}
