"use client";

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldControlId } from "./model";
import { isFieldControlId } from "./model";
import styles from "../../../sns/navigation/2/navigation.module.css";
import { useFingerSkatingFieldSocket } from "./transport/use-field-socket";

type Action = {
  count?: string;
  id: FieldControlId;
  label: string;
};

type PointerPhase = "start" | "move" | "end";
type QueuedGesture = {
  controlId: FieldControlId;
  phase: PointerPhase;
  pointerId: number;
  x: number;
  y: number;
};
type ActivePointer = Omit<QueuedGesture, "phase"> & { rowIndex: number };

const actions: readonly Action[] = [
  { count: "3,473", id: "like", label: "Like" },
  { count: "81", id: "comment", label: "Comment" },
  { id: "repost", label: "Repost" },
  { count: "525", id: "send", label: "Send" },
  { id: "save", label: "Save" },
];
const initialRowCount = 8;

function selectionKey(rowIndex: number, controlId: FieldControlId) {
  return `${rowIndex}:${controlId}`;
}

export default function FingerSkatingFieldOneMobile() {
  const { sendGesture } = useFingerSkatingFieldSocket({ role: "mobile" });
  const surfaceRef = useRef<HTMLElement | null>(null);
  const activePointersRef = useRef(new Map<number, ActivePointer>());
  const activeSelectionSignatureRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const queuedGesturesRef = useRef<Map<number, QueuedGesture>>(new Map());
  const [rowCount, setRowCount] = useState(initialRowCount);
  const [selectedActions, setSelectedActions] = useState<(FieldControlId | null)[]>(
    () => Array.from({ length: initialRowCount }, () => null),
  );
  const [skatingSelections, setSkatingSelections] = useState<string[]>([]);

  useEffect(() => {
    const syncRowCount = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const referenceRowHeight = Math.min(127, Math.max(34, viewportWidth * 0.1078));
      const nextRowCount = Math.max(1, Math.min(18, Math.floor(viewportHeight / referenceRowHeight)));

      setRowCount(nextRowCount);
      setSelectedActions((current) =>
        Array.from({ length: nextRowCount }, (_, index) => current[index] ?? null),
      );
    };

    syncRowCount();
    window.addEventListener("resize", syncRowCount);
    window.visualViewport?.addEventListener("resize", syncRowCount);

    return () => {
      window.removeEventListener("resize", syncRowCount);
      window.visualViewport?.removeEventListener("resize", syncRowCount);
    };
  }, []);

  const refreshSkatingSelections = useCallback(() => {
    const next = new Set(
      [...activePointersRef.current.values()].map((pointer) =>
        selectionKey(pointer.rowIndex, pointer.controlId),
      ),
    );
    const signature = [...next].sort().join("|");
    if (signature === activeSelectionSignatureRef.current) return;

    activeSelectionSignatureRef.current = signature;
    setSkatingSelections([...next]);
  }, []);

  const setRowAction = useCallback((rowIndex: number, controlId: FieldControlId) => {
    setSelectedActions((current) => {
      if (rowIndex < 0 || rowIndex >= current.length || current[rowIndex] === controlId) {
        return current;
      }

      return current.map((action, index) => (index === rowIndex ? controlId : action));
    });
  }, []);

  const flushQueuedGestures = useCallback(() => {
    frameRef.current = null;
    for (const gesture of queuedGesturesRef.current.values()) {
      sendGesture(gesture);
    }
    queuedGesturesRef.current.clear();
  }, [sendGesture]);

  const sendPointerGesture = useCallback(
    (gesture: QueuedGesture) => {
      if (gesture.phase === "move") {
        queuedGesturesRef.current.set(gesture.pointerId, gesture);
        if (frameRef.current === null) {
          frameRef.current = window.requestAnimationFrame(flushQueuedGestures);
        }
        return;
      }

      const queuedMove = queuedGesturesRef.current.get(gesture.pointerId);
      if (queuedMove) {
        queuedGesturesRef.current.delete(gesture.pointerId);
        sendGesture(queuedMove);
      }
      sendGesture(gesture);
    },
    [flushQueuedGestures, sendGesture],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const selectAtPoint = useCallback(
    (
      pointerId: number,
      clientX: number,
      clientY: number,
      target: HTMLElement,
      phase: PointerPhase,
    ) => {
      const control = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-skate-row][data-skate-action]");
      const controlId = control?.dataset.skateAction;
      const rowIndex = Number(control?.dataset.skateRow);

      if (!Number.isInteger(rowIndex) || !controlId || !isFieldControlId(controlId)) {
        return false;
      }

      const bounds = target.getBoundingClientRect();
      const activePointer = {
        controlId,
        pointerId,
        rowIndex,
        x: Math.min(Math.max((clientX - bounds.left) / bounds.width, 0), 1),
        y: Math.min(Math.max((clientY - bounds.top) / bounds.height, 0), 1),
      };
      activePointersRef.current.set(pointerId, activePointer);
      setRowAction(rowIndex, controlId);
      refreshSkatingSelections();
      sendPointerGesture({ ...activePointer, phase });
      return true;
    },
    [refreshSkatingSelections, sendPointerGesture, setRowAction],
  );

  const selectPointerSamples = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      phase: Exclude<PointerPhase, "end">,
    ) => {
      const samples = event.nativeEvent.getCoalescedEvents?.();
      for (const sample of samples?.length ? samples : [event.nativeEvent]) {
        selectAtPoint(
          event.pointerId,
          sample.clientX,
          sample.clientY,
          event.currentTarget,
          phase,
        );
      }
    },
    [selectAtPoint],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!activePointersRef.current.has(event.pointerId)) return;

      selectPointerSamples(event, "move");
      const activePointer = activePointersRef.current.get(event.pointerId);
      if (activePointer) sendPointerGesture({ ...activePointer, phase: "end" });
      activePointersRef.current.delete(event.pointerId);
      refreshSkatingSelections();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [refreshSkatingSelections, selectPointerSamples, sendPointerGesture],
  );

  const cancelPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activePointer = activePointersRef.current.get(event.pointerId);
      if (activePointer) sendPointerGesture({ ...activePointer, phase: "end" });
      activePointersRef.current.delete(event.pointerId);
      refreshSkatingSelections();
    },
    [refreshSkatingSelections, sendPointerGesture],
  );

  const activateByKeyboard = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      rowIndex: number,
      controlId: FieldControlId,
    ) => {
      if (event.detail !== 0 || !surfaceRef.current) return;

      const surfaceBounds = surfaceRef.current.getBoundingClientRect();
      const controlBounds = event.currentTarget.getBoundingClientRect();
      const pointerId = -(rowIndex * actions.length + actions.findIndex((action) => action.id === controlId) + 1);
      const x = Math.min(
        Math.max((controlBounds.left + controlBounds.width / 2 - surfaceBounds.left) / surfaceBounds.width, 0),
        1,
      );
      const y = Math.min(
        Math.max((controlBounds.top + controlBounds.height / 2 - surfaceBounds.top) / surfaceBounds.height, 0),
        1,
      );

      setRowAction(rowIndex, controlId);
      sendPointerGesture({ controlId, phase: "start", pointerId, x, y });
      sendPointerGesture({ controlId, phase: "move", pointerId, x: Math.min(x + 0.012, 1), y });
      sendPointerGesture({ controlId, phase: "end", pointerId, x, y });
    },
    [sendPointerGesture, setRowAction],
  );

  return (
    <main
      ref={surfaceRef}
      className={styles.experiment}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onLostPointerCapture={cancelPointer}
      onPointerCancel={cancelPointer}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (!selectAtPoint(event.pointerId, event.clientX, event.clientY, event.currentTarget, "start")) {
          return;
        }
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (activePointersRef.current.has(event.pointerId)) {
          selectPointerSamples(event, "move");
        }
      }}
      onPointerUp={finishPointer}
    >
      <section
        aria-label="Instagram action rows for finger skating"
        className={styles.stack}
        style={{ gridTemplateRows: `repeat(${rowCount}, var(--reference-row-height))` }}
      >
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <nav
            aria-label={`Instagram post actions ${rowIndex + 1}`}
            className={styles.actionRow}
            key={`field-one-action-row-${rowIndex}`}
          >
            <Image
              alt=""
              aria-hidden="true"
              className={styles.referenceStrip}
              height={202}
              sizes="100vw"
              src="/images/sns/navigation/2/instagram-action-row-reference.jpg"
              width={1178}
            />
            {actions.map((action) => {
              const key = selectionKey(rowIndex, action.id);

              return (
                <button
                  aria-label={action.count ? `${action.label}, ${action.count}` : action.label}
                  aria-pressed={selectedActions[rowIndex] === action.id}
                  className={styles.actionButton}
                  data-action={action.id}
                  data-skate-action={action.id}
                  data-skate-row={rowIndex}
                  data-skating={skatingSelections.includes(key) || undefined}
                  key={action.id}
                  onClick={(event) => activateByKeyboard(event, rowIndex, action.id)}
                  type="button"
                />
              );
            })}
          </nav>
        ))}
      </section>
    </main>
  );
}
