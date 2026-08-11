"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { AccumulationProfile } from "../profiles";
import type {
  ActiveBackgroundDrop,
  ActiveDropStream,
  DropOrigin,
  DropSource,
} from "../types";

const traceVolumeDistancePixels = 260;
const stationaryMotionDistancePixels = 2.5;
const heldDropAccumulationAmount = 0.25;
const releaseSweepIntervalMs = 34;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function toDropOrigin(
  element: HTMLElement,
  clientX: number,
  clientY: number,
): DropOrigin {
  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);

  return {
    x: clamp((clientX - bounds.left) / width),
    y: clamp(1 - (clientY - bounds.top) / height),
  };
}

type UseDropInteractionOptions = {
  disabled?: boolean;
  onDropSettled?: (amount: number) => void;
  profile: AccumulationProfile;
};

type PointerSample = {
  clientX: number;
  clientY: number;
};

type ActivePointer = {
  element: HTMLDivElement;
  frameId: number | null;
  holdTimer: number | null;
  lastEmittedSample: PointerSample;
  lastMotionSample: PointerSample;
  lastMotionAt: number;
  lastObservedSample: PointerSample;
  pendingSample: PointerSample | null;
  pendingTravelDistance: number;
};

type DropRequestOptions = {
  accumulationAmount?: number;
  previousOrigin?: DropOrigin;
  source?: DropSource;
  visualStrength?: number;
};

type PendingRelease = {
  drop: ActiveBackgroundDrop;
  settlesAt: number;
};

function pointerSamples(event: ReactPointerEvent<HTMLDivElement>) {
  const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
  return samples.length > 0 ? samples : [event.nativeEvent];
}

export function useDropInteraction({
  disabled = false,
  onDropSettled,
  profile,
}: UseDropInteractionOptions) {
  const nextDropIdRef = useRef(0);
  const activeDropsBySourceRef = useRef<
    Record<DropSource, Map<number, ActiveBackgroundDrop>>
  >({
    hold: new Map(),
    press: new Map(),
    trace: new Map(),
  });
  const dropStream = useMemo<ActiveDropStream>(
    () => ({
      getDrops(source) {
        return [...activeDropsBySourceRef.current[source].values()];
      },
    }),
    [],
  );
  const pendingReleasesRef = useRef(new Map<number, PendingRelease>());
  const releaseSweepTimerRef = useRef<number | null>(null);
  const activePointersRef = useRef(new Map<number, ActivePointer>());
  const pendingReleasedDropsRef = useRef(
    new Map<number, ActiveBackgroundDrop>(),
  );
  const releaseFrameRef = useRef<number | null>(null);
  const onDropSettledRef = useRef(onDropSettled);
  const dropDurationMs = Math.ceil(profile.fall.duration[1] * 1000);
  const heldDropIntervalMs = Math.round(
    clamp(profile.fall.backgroundDuration * 100, 160, 280),
  );

  useEffect(() => {
    onDropSettledRef.current = onDropSettled;
  }, [onDropSettled]);

  const flushReleasedDrops = useCallback(() => {
    releaseFrameRef.current = null;
    const releasedDrops = [...pendingReleasedDropsRef.current.values()];
    if (releasedDrops.length === 0) return;

    pendingReleasedDropsRef.current.clear();
    const accumulatedAmount = releasedDrops.reduce(
      (total, drop) => total + drop.accumulationAmount,
      0,
    );
    for (const drop of releasedDrops) {
      activeDropsBySourceRef.current[drop.source].delete(drop.id);
    }
    onDropSettledRef.current?.(accumulatedAmount);
  }, []);

  const scheduleReleasedDrop = useCallback(
    (drop: ActiveBackgroundDrop) => {
      pendingReleasedDropsRef.current.set(drop.id, drop);
      if (releaseFrameRef.current === null) {
        releaseFrameRef.current = window.requestAnimationFrame(
          flushReleasedDrops,
        );
      }
    },
    [flushReleasedDrops],
  );

  const scheduleReleaseSweep = useCallback(() => {
    if (releaseSweepTimerRef.current !== null) return;

    function sweepReleasedDrops() {
      releaseSweepTimerRef.current = null;
      const now = Date.now();

      for (const [dropId, pendingRelease] of pendingReleasesRef.current) {
        if (pendingRelease.settlesAt > now) continue;
        pendingReleasesRef.current.delete(dropId);
        scheduleReleasedDrop(pendingRelease.drop);
      }

      if (pendingReleasesRef.current.size > 0) {
        releaseSweepTimerRef.current = window.setTimeout(
          sweepReleasedDrops,
          releaseSweepIntervalMs,
        );
      }
    }

    releaseSweepTimerRef.current = window.setTimeout(
      sweepReleasedDrops,
      releaseSweepIntervalMs,
    );
  }, [scheduleReleasedDrop]);

  const requestDrop = useCallback(
    (origin: DropOrigin, options: DropRequestOptions = {}) => {
      if (disabled) return false;

      const source = options.source ?? "press";
      const drop: ActiveBackgroundDrop = {
        accumulationAmount: options.accumulationAmount ?? 1,
        id: nextDropIdRef.current + 1,
        origin,
        previousOrigin: options.previousOrigin ?? origin,
        source,
        startedAt: Date.now(),
        visualStrength: options.visualStrength ?? 1,
      };
      nextDropIdRef.current += 1;
      activeDropsBySourceRef.current[source].set(drop.id, drop);

      pendingReleasesRef.current.set(drop.id, {
        drop,
        settlesAt: drop.startedAt + dropDurationMs,
      });
      scheduleReleaseSweep();

      return true;
    },
    [disabled, dropDurationMs, scheduleReleaseSweep],
  );

  const stopDrops = useCallback(() => {
    if (releaseSweepTimerRef.current !== null) {
      window.clearTimeout(releaseSweepTimerRef.current);
      releaseSweepTimerRef.current = null;
    }
    pendingReleasesRef.current.clear();
    activeDropsBySourceRef.current.press.clear();
    activeDropsBySourceRef.current.trace.clear();
    activeDropsBySourceRef.current.hold.clear();
    for (const pointer of activePointersRef.current.values()) {
      if (pointer.frameId !== null) {
        window.cancelAnimationFrame(pointer.frameId);
      }
      if (pointer.holdTimer !== null) {
        window.clearTimeout(pointer.holdTimer);
      }
    }
    activePointersRef.current.clear();
    pendingReleasedDropsRef.current.clear();
    if (releaseFrameRef.current !== null) {
      window.cancelAnimationFrame(releaseFrameRef.current);
      releaseFrameRef.current = null;
    }
  }, []);

  useEffect(() => stopDrops, [stopDrops]);

  const emitTraceSamples = useCallback(
    (pointer: ActivePointer) => {
      const sample = pointer.pendingSample;
      const travelledDistance = pointer.pendingTravelDistance;
      pointer.pendingSample = null;
      pointer.pendingTravelDistance = 0;
      if (!sample || travelledDistance < 0.5) return;

      const previousOrigin = toDropOrigin(
        pointer.element,
        pointer.lastEmittedSample.clientX,
        pointer.lastEmittedSample.clientY,
      );
      const origin = toDropOrigin(
        pointer.element,
        sample.clientX,
        sample.clientY,
      );
      requestDrop(origin, {
        accumulationAmount: travelledDistance / traceVolumeDistancePixels,
        previousOrigin,
        source: "trace",
        visualStrength: clamp(travelledDistance / 30, 0.28, 1),
      });
      pointer.lastEmittedSample = sample;
    },
    [requestDrop],
  );

  const scheduleTraceSamples = useCallback(
    (pointerId: number) => {
      const pointer = activePointersRef.current.get(pointerId);
      if (!pointer || pointer.frameId !== null) return;

      pointer.frameId = window.requestAnimationFrame(() => {
        const activePointer = activePointersRef.current.get(pointerId);
        if (!activePointer) return;

        activePointer.frameId = null;
        emitTraceSamples(activePointer);
      });
    },
    [emitTraceSamples],
  );

  const scheduleHeldDrops = useCallback(
    (pointerId: number) => {
      function scheduleNextHeldDrop() {
        const pointer = activePointersRef.current.get(pointerId);
        if (!pointer || pointer.holdTimer !== null) return;

        pointer.holdTimer = window.setTimeout(() => {
          const activePointer = activePointersRef.current.get(pointerId);
          if (!activePointer) return;

          activePointer.holdTimer = null;
          const now = Date.now();
          if (now - activePointer.lastMotionAt >= heldDropIntervalMs) {
            const origin = toDropOrigin(
              activePointer.element,
              activePointer.lastObservedSample.clientX,
              activePointer.lastObservedSample.clientY,
            );
            requestDrop(origin, {
              accumulationAmount: heldDropAccumulationAmount,
              previousOrigin: origin,
              source: "hold",
              visualStrength: 0.72,
            });
          }
          scheduleNextHeldDrop();
        }, heldDropIntervalMs);
      }

      scheduleNextHeldDrop();
    },
    [heldDropIntervalMs, requestDrop],
  );

  const appendPointerSamples = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pointer = activePointersRef.current.get(event.pointerId);
      if (!pointer) return;

      for (const sample of pointerSamples(event)) {
        const nextSample = {
          clientX: sample.clientX,
          clientY: sample.clientY,
        };
        pointer.pendingTravelDistance += Math.hypot(
          nextSample.clientX - pointer.lastObservedSample.clientX,
          nextSample.clientY - pointer.lastObservedSample.clientY,
        );
        if (
          Math.hypot(
            nextSample.clientX - pointer.lastMotionSample.clientX,
            nextSample.clientY - pointer.lastMotionSample.clientY,
          ) >= stationaryMotionDistancePixels
        ) {
          pointer.lastMotionSample = nextSample;
          pointer.lastMotionAt = Date.now();
        }
        pointer.lastObservedSample = nextSample;
        pointer.pendingSample = nextSample;
      }
    },
    [],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, includePosition: boolean) => {
      const pointer = activePointersRef.current.get(event.pointerId);
      if (!pointer) return;

      if (pointer.frameId !== null) {
        window.cancelAnimationFrame(pointer.frameId);
        pointer.frameId = null;
      }
      if (pointer.holdTimer !== null) {
        window.clearTimeout(pointer.holdTimer);
        pointer.holdTimer = null;
      }
      if (includePosition) appendPointerSamples(event);
      emitTraceSamples(pointer);
      activePointersRef.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [appendPointerSamples, emitTraceSamples],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const origin = toDropOrigin(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      requestDrop(origin);
      activePointersRef.current.set(event.pointerId, {
        element: event.currentTarget,
        frameId: null,
        holdTimer: null,
        lastEmittedSample: { clientX: event.clientX, clientY: event.clientY },
        lastMotionSample: { clientX: event.clientX, clientY: event.clientY },
        lastMotionAt: Date.now(),
        lastObservedSample: { clientX: event.clientX, clientY: event.clientY },
        pendingSample: null,
        pendingTravelDistance: 0,
      });
      scheduleHeldDrops(event.pointerId);
    },
    [disabled, requestDrop, scheduleHeldDrops],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || !activePointersRef.current.has(event.pointerId)) return;

      event.preventDefault();
      appendPointerSamples(event);
      scheduleTraceSamples(event.pointerId);
    },
    [appendPointerSamples, disabled, scheduleTraceSamples],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => finishPointer(event, true),
    [finishPointer],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => finishPointer(event, false),
    [finishPointer],
  );

  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pointer = activePointersRef.current.get(event.pointerId);
      if (pointer?.frameId !== null && pointer?.frameId !== undefined) {
        window.cancelAnimationFrame(pointer.frameId);
      }
      if (pointer?.holdTimer !== null && pointer?.holdTimer !== undefined) {
        window.clearTimeout(pointer.holdTimer);
      }
      activePointersRef.current.delete(event.pointerId);
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || (event.key !== "Enter" && event.key !== " ")) return;

      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      requestDrop(
        toDropOrigin(
          event.currentTarget,
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        ),
      );
    },
    [disabled, requestDrop],
  );

  return {
    dropStream,
    interactionProps: {
      onKeyDown,
      onLostPointerCapture,
      onPointerCancel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
    requestDrop,
    stopDrops,
  };
}
