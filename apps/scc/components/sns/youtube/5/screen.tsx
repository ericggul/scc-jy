"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./screen.module.css";

type Canvas = {
  height: number;
  width: number;
};

type SkatingSurfaceStyle = CSSProperties & Record<"--youtube-five-column-count", string>;

const columnCount = 7;
const columns = Array.from({ length: columnCount }, (_, index) => ({ id: `column-${index}`, index }));
const columnIds = new Set(columns.map((column) => column.id));
const skatingSurfaceStyle: SkatingSurfaceStyle = {
  "--youtube-five-column-count": String(columnCount),
};
const laptopCanvas: Canvas = { width: 1920, height: 1080 };
const phoneCanvas: Canvas = { width: 390, height: 844 };

function frameForViewport(width: number, height: number) {
  const canvas = width < 768 ? phoneCanvas : laptopCanvas;

  return {
    canvas,
    scaleX: width / (canvas.width * columns.length),
    scaleY: height / canvas.height,
  };
}

export function YoutubeFiveScreen() {
  const [frame, setFrame] = useState<ReturnType<typeof frameForViewport>>();
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const activePointerId = useRef<number | null>(null);
  const selectedColumnIdRef = useRef<string | null>(null);
  const pointerGestureEndedAt = useRef(0);

  useEffect(() => {
    const resize = () => setFrame(frameForViewport(window.innerWidth, window.innerHeight));

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  if (!frame) {
    return <main className={styles.surface} />;
  }

  const { canvas, scaleX, scaleY } = frame;

  const selectColumn = (columnId: string) => {
    if (!columnIds.has(columnId) || selectedColumnIdRef.current === columnId) return;
    selectedColumnIdRef.current = columnId;
    setSelectedColumnId(columnId);
  };

  const selectAtPoint = (clientX: number, clientY: number) => {
    const columnId = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-youtube-five-column]")
      ?.dataset.youtubeFiveColumn;
    if (columnId) selectColumn(columnId);
  };

  const selectPointerSamples = (event: ReactPointerEvent<HTMLDivElement>) => {
    const samples = event.nativeEvent.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event.nativeEvent]) {
      selectAtPoint(sample.clientX, sample.clientY);
    }
  };

  const finishGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointerId.current) return;
    selectPointerSamples(event);
    activePointerId.current = null;
    pointerGestureEndedAt.current = Date.now();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    selectPointerSamples(event);
  };

  const continueGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId === activePointerId.current) selectPointerSamples(event);
  };

  return (
    <main className={styles.surface}>
      {columns.map(({ id, index }) => (
        <iframe
          className={`${styles.frame} ${selectedColumnId && selectedColumnId !== id ? styles.inactiveFrame : ""}`}
          height={canvas.height}
          key={id}
          src="/sns/youtube/2"
          style={{
            left: index * canvas.width * scaleX,
            transform: `scale(${scaleX}, ${scaleY})`,
          }}
          title={`YouTube 2 column ${index + 1}`}
          width={canvas.width}
        />
      ))}
      <div
        aria-label="Finger-skate YouTube columns"
        className={styles.skatingSurface}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onLostPointerCapture={(event) => {
          if (event.pointerId === activePointerId.current) {
            activePointerId.current = null;
            pointerGestureEndedAt.current = Date.now();
          }
        }}
        onPointerCancel={(event) => {
          if (event.pointerId === activePointerId.current) {
            activePointerId.current = null;
            pointerGestureEndedAt.current = Date.now();
          }
        }}
        onPointerDown={startGesture}
        onPointerMove={continueGesture}
        onPointerUp={finishGesture}
        style={skatingSurfaceStyle}
      >
        {columns.map(({ id }) => (
          <button
            aria-label={`Select YouTube column ${id.replace("column-", "")}`}
            aria-pressed={selectedColumnId === id}
            className={styles.skatingColumn}
            data-youtube-five-column={id}
            key={id}
            onClick={(event) => {
              if (event.detail !== 0 && Date.now() - pointerGestureEndedAt.current < 750) return;
              selectColumn(id);
            }}
            type="button"
          />
        ))}
      </div>
    </main>
  );
}
