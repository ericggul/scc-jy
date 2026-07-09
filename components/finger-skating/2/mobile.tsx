"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useExperimentSocket } from "@/hooks/use-experiment-socket";

const EXPERIMENT_ID = "finger-skating";
const gridColumnCount = 10;
const initialRows = 1;
const fixedHue = 196;
const fixedIntensity = 0.72;

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #171717;
  color: #f8f3e8;
  touch-action: none;
  overscroll-behavior: none;
`;

const Surface = styled.div<{ $rows: number }>`
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(${gridColumnCount}, minmax(0, 1fr));
  grid-template-rows: repeat(
    ${({ $rows }) => $rows},
    calc(100dvw / ${gridColumnCount})
  );
  width: 100dvw;
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  border: 0;
  background: #171717;
  color: inherit;
  cursor: crosshair;
  touch-action: none;
  appearance: none;

  > span {
    aspect-ratio: 1;
    border-right: 1px solid rgba(248, 243, 232, 0.12);
    border-bottom: 1px solid rgba(248, 243, 232, 0.12);
    background: rgba(248, 243, 232, 0.018);
  }

  > span[data-active="true"] {
    background: hsl(${fixedHue} 88% 62% / 0.72);
    box-shadow: 0 0 18px hsl(${fixedHue} 88% 62% / 0.38);
  }
`;

type ActivePointer = {
  cellIndex: number;
};

type ActivePointers = Record<number, ActivePointer>;
type PointerPhase = "start" | "move" | "end";
type QueuedSignal = {
  hue: number;
  intensity: number;
  label: string;
  phase: PointerPhase;
  pointerId: number;
  streamId: string;
  x: number;
  y: number;
};

function getViewportRows() {
  const cellSize = window.innerWidth / gridColumnCount;
  return Math.max(1, Math.ceil(window.innerHeight / cellSize));
}

export default function FingerSkatingTwoMobile() {
  const { sendSignal } = useExperimentSocket({
    experimentId: EXPERIMENT_ID,
    role: "mobile",
  });
  const frameRef = useRef<number | null>(null);
  const queuedSignalsRef = useRef<Map<number, QueuedSignal>>(new Map());
  const [rows, setRows] = useState(initialRows);
  const [activePointers, setActivePointers] = useState<ActivePointers>({});
  const [lastCellIndex, setLastCellIndex] = useState<number | null>(null);
  const cellCount = rows * gridColumnCount;
  const activeCells = useMemo(() => {
    const pointerCells = Object.values(activePointers).map(
      (pointer) => pointer.cellIndex,
    );
    return new Set(
      pointerCells.length > 0
        ? pointerCells
        : lastCellIndex === null
          ? []
          : [lastCellIndex],
    );
  }, [activePointers, lastCellIndex]);

  useEffect(() => {
    function handleResize() {
      setRows(getViewportRows());
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const flushQueuedSignals = useCallback(() => {
    frameRef.current = null;

    const queuedSignals = queuedSignalsRef.current;
    if (queuedSignals.size === 0) return;

    for (const signal of queuedSignals.values()) {
      sendSignal(signal);
    }
    queuedSignals.clear();
  }, [sendSignal]);

  const sendPointerSignal = useCallback(
    (signal: QueuedSignal) => {
      if (signal.phase === "move") {
        queuedSignalsRef.current.set(signal.pointerId, signal);

        if (frameRef.current === null) {
          frameRef.current = window.requestAnimationFrame(flushQueuedSignals);
        }
        return;
      }

      const queuedMove = queuedSignalsRef.current.get(signal.pointerId);
      if (queuedMove) {
        queuedSignalsRef.current.delete(signal.pointerId);
        sendSignal(queuedMove);
      }

      sendSignal(signal);
    },
    [flushQueuedSignals, sendSignal],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function emitAt(
    pointerId: number,
    clientX: number,
    clientY: number,
    target: HTMLDivElement,
    phase: PointerPhase,
  ) {
    const rect = target.getBoundingClientRect();
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    const column = Math.min(
      gridColumnCount - 1,
      Math.floor(x * gridColumnCount),
    );
    const row = Math.min(rows - 1, Math.floor(y * rows));
    const cellIndex = row * gridColumnCount + column;

    if (phase !== "end") {
      setActivePointers((current) => ({
        ...current,
        [pointerId]: { cellIndex },
      }));
    }
    setLastCellIndex(cellIndex);
    sendPointerSignal({
      hue: fixedHue,
      intensity: fixedIntensity,
      x,
      y,
      pointerId,
      phase,
      streamId: `pointer-${pointerId}`,
      label: "grid-touch",
    });
  }

  function releasePointer(pointerId: number) {
    setActivePointers((current) => {
      const next = { ...current };
      delete next[pointerId];
      return next;
    });
  }

  return (
    <Page>
      <Surface
        $rows={rows}
        aria-label="Finger skating grid"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          emitAt(
            event.pointerId,
            event.clientX,
            event.clientY,
            event.currentTarget,
            "start",
          );
        }}
        onPointerMove={(event) => {
          if (
            event.pointerType === "touch" ||
            event.buttons > 0 ||
            activePointers[event.pointerId] !== undefined
          ) {
            emitAt(
              event.pointerId,
              event.clientX,
              event.clientY,
              event.currentTarget,
              "move",
            );
          }
        }}
        onPointerCancel={(event) => {
          emitAt(
            event.pointerId,
            event.clientX,
            event.clientY,
            event.currentTarget,
            "end",
          );
          releasePointer(event.pointerId);
        }}
        onPointerLeave={(event) => {
          emitAt(
            event.pointerId,
            event.clientX,
            event.clientY,
            event.currentTarget,
            "end",
          );
          releasePointer(event.pointerId);
        }}
        onPointerUp={(event) => {
          emitAt(
            event.pointerId,
            event.clientX,
            event.clientY,
            event.currentTarget,
            "end",
          );
          releasePointer(event.pointerId);
        }}
        role="application"
      >
        {Array.from({ length: cellCount }, (_, index) => (
          <span
            aria-hidden="true"
            data-active={activeCells.has(index) ? "true" : undefined}
            key={index}
          />
        ))}
      </Surface>
    </Page>
  );
}
