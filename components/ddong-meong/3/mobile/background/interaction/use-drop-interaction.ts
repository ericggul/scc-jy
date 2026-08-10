"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { AccumulationProfile } from "../profiles";
import type {
  ActiveBackgroundDrop,
  DropOrigin,
  DropSource,
} from "../types";

const traceVolumeDistancePixels = 260;

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
  lastEmittedSample: PointerSample;
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

function pointerSamples(event: ReactPointerEvent<HTMLDivElement>) {
  const samples = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
  return samples.length > 0 ? samples : [event.nativeEvent];
}

export function useDropInteraction({
  disabled = false,
  onDropSettled,
  profile,
}: UseDropInteractionOptions) {
  const [activeDrops, setActiveDrops] = useState<ActiveBackgroundDrop[]>([]);
  const nextDropIdRef = useRef(0);
  const releaseTimersRef = useRef(new Map<number, number>());
  const activePointersRef = useRef(new Map<number, ActivePointer>());
  const pendingReleasedDropsRef = useRef(
    new Map<number, ActiveBackgroundDrop>(),
  );
  const releaseFrameRef = useRef<number | null>(null);
  const onDropSettledRef = useRef(onDropSettled);
  const dropDurationMs = Math.ceil(profile.fall.duration[1] * 1000);

  useEffect(() => {
    onDropSettledRef.current = onDropSettled;
  }, [onDropSettled]);

  const flushReleasedDrops = useCallback(() => {
    releaseFrameRef.current = null;
    const releasedDrops = [...pendingReleasedDropsRef.current.values()];
    if (releasedDrops.length === 0) return;

    pendingReleasedDropsRef.current.clear();
    const releasedIds = new Set(releasedDrops.map((drop) => drop.id));
    const accumulatedAmount = releasedDrops.reduce(
      (total, drop) => total + drop.accumulationAmount,
      0,
    );
    setActiveDrops((drops) =>
      drops.filter((drop) => !releasedIds.has(drop.id)),
    );
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

  const requestDrop = useCallback(
    (origin: DropOrigin, options: DropRequestOptions = {}) => {
      if (disabled) return false;

      const drop: ActiveBackgroundDrop = {
        accumulationAmount: options.accumulationAmount ?? 1,
        id: nextDropIdRef.current + 1,
        origin,
        previousOrigin: options.previousOrigin ?? origin,
        source: options.source ?? "press",
        startedAt: Date.now(),
        visualStrength: options.visualStrength ?? 1,
      };
      nextDropIdRef.current += 1;
      setActiveDrops((drops) => [...drops, drop]);

      const releaseTimer = window.setTimeout(() => {
        releaseTimersRef.current.delete(drop.id);
        scheduleReleasedDrop(drop);
      }, dropDurationMs);
      releaseTimersRef.current.set(drop.id, releaseTimer);

      return true;
    },
    [disabled, dropDurationMs, scheduleReleasedDrop],
  );

  const stopDrops = useCallback(() => {
    for (const timer of releaseTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    releaseTimersRef.current.clear();
    for (const pointer of activePointersRef.current.values()) {
      if (pointer.frameId !== null) {
        window.cancelAnimationFrame(pointer.frameId);
      }
    }
    activePointersRef.current.clear();
    pendingReleasedDropsRef.current.clear();
    if (releaseFrameRef.current !== null) {
      window.cancelAnimationFrame(releaseFrameRef.current);
      releaseFrameRef.current = null;
    }
    setActiveDrops([]);
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
        lastEmittedSample: { clientX: event.clientX, clientY: event.clientY },
        lastObservedSample: { clientX: event.clientX, clientY: event.clientY },
        pendingSample: null,
        pendingTravelDistance: 0,
      });
    },
    [disabled, requestDrop],
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
    activeDrops,
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
