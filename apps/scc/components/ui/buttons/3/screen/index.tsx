"use client";

import type { MouseEvent, PointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./mp3-transport-field.module.css";
import {
  drawCanvasCell,
  drawCanvasField,
  getCanvasGridSize,
  hitTestCanvasButton,
  prepareCanvas,
  resizePlaybackStateBuffer,
  type CanvasFieldMode,
  type CanvasFrame,
  type CanvasGridSize,
} from "./mp3-button-canvas";
import {
  getPointillistSource,
  isPointillistSourceId,
  loadPointillistImage,
  pointillistSources,
  samplePointillistImage,
  type PointillistSourceId,
} from "./pointillist";

type FieldMode = "transport" | "pointillist";

type PointillistSample = {
  columns: number;
  rows: number;
  sourceId: PointillistSourceId;
  tones: Uint8Array;
};

const INITIAL_GRID_SIZE: CanvasGridSize = { columns: 1, rows: 1 };

const FieldModeControl = memo(function FieldModeControl({
  activeSource,
  fieldMode,
  onClick,
}: {
  activeSource: PointillistSourceId;
  fieldMode: FieldMode;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      aria-label="MP3 transport field mode"
      className={styles.fieldControl}
      onClick={onClick}
      role="group"
    >
      <button
        aria-label="MP3 transport pattern"
        aria-pressed={fieldMode === "transport"}
        className={styles.fieldMode}
        data-field-mode="transport"
        type="button"
      >
        ▶
      </button>
      <span className={styles.sourceModes}>
        {pointillistSources.map((source) => (
          <button
            aria-label={`${source.label} in black and white`}
            aria-pressed={fieldMode === "pointillist" && source.id === activeSource}
            className={styles.pointillistSource}
            data-pointillist-source={source.id}
            key={source.id}
            title={source.label}
            type="button"
          >
            <span
              aria-hidden="true"
              className={styles.sourceThumbnail}
              style={{ backgroundImage: `url(${source.imageUrl})` }}
            />
          </button>
        ))}
      </span>
    </div>
  );
});

export function Mp3TransportField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<CanvasFrame | null>(null);
  const statesRef = useRef<Uint8Array>(new Uint8Array(1));
  const lastPointerCellRef = useRef<number | null>(null);
  const [gridSize, setGridSize] = useState<CanvasGridSize>(INITIAL_GRID_SIZE);
  const [fieldMode, setFieldMode] = useState<FieldMode>("transport");
  const [sourceId, setSourceId] = useState<PointillistSourceId>("mona-lisa");
  const [pointillistImage, setPointillistImage] = useState<HTMLImageElement | null>(null);
  const [loadedSourceId, setLoadedSourceId] = useState<PointillistSourceId | null>(null);
  const [pointillistSample, setPointillistSample] = useState<PointillistSample | null>(null);
  const pointillistSource = useMemo(() => getPointillistSource(sourceId), [sourceId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrame: number | null = null;
    const updateGridSize = () => {
      animationFrame = null;
      const bounds = canvas.getBoundingClientRect();
      const next = getCanvasGridSize(bounds.width, bounds.height);
      setGridSize((current) => (
        current.columns === next.columns && current.rows === next.rows ? current : next
      ));
    };
    const scheduleGridSizeUpdate = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(updateGridSize);
    };

    scheduleGridSizeUpdate();
    const observer = new ResizeObserver(scheduleGridSizeUpdate);
    observer.observe(canvas);
    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  const buttonCount = gridSize.columns * gridSize.rows;
  const isPointillistReady = Boolean(
    pointillistSample
      && pointillistSample.sourceId === sourceId
      && pointillistSample.columns === gridSize.columns
      && pointillistSample.rows === gridSize.rows
      && pointillistSample.tones.length === buttonCount,
  );
  const activeTones = isPointillistReady ? pointillistSample?.tones : undefined;
  const renderMode: CanvasFieldMode = fieldMode === "pointillist" && isPointillistReady
    ? "pointillist"
    : "transport";

  useEffect(() => {
    let cancelled = false;

    void loadPointillistImage(pointillistSource)
      .then((image) => {
        if (cancelled) return;
        setPointillistImage(image);
        setLoadedSourceId(pointillistSource.id);
      })
      .catch(() => {
        if (cancelled) return;
        setPointillistImage(null);
        setLoadedSourceId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pointillistSource]);

  useEffect(() => {
    if (!pointillistImage || loadedSourceId !== sourceId) return;

    const animationFrame = window.requestAnimationFrame(() => {
      setPointillistSample({
        columns: gridSize.columns,
        rows: gridSize.rows,
        sourceId,
        tones: samplePointillistImage(pointillistImage, gridSize.columns, gridSize.rows),
      });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [gridSize, loadedSourceId, pointillistImage, sourceId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const surface = prepareCanvas(canvas);
    if (!surface) return;

    statesRef.current = resizePlaybackStateBuffer(statesRef.current, buttonCount);
    const frame: CanvasFrame = {
      context: surface.context,
      fieldMode: renderMode,
      gridSize,
      height: surface.height,
      imageTones: activeTones,
      width: surface.width,
    };
    frameRef.current = frame;
    drawCanvasField(frame, statesRef.current);
  }, [activeTones, buttonCount, gridSize, renderMode]);

  const advanceCell = useCallback((index: number) => {
    const frame = frameRef.current;
    if (!frame) return;

    const states = statesRef.current;
    states[index] = ((states[index] ?? index % 3) + 1) % 3;
    drawCanvasCell(frame, states, index);
  }, []);

  const handleCanvasPointerMove = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "mouse") return;
    const frame = frameRef.current;
    if (!frame) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const index = hitTestCanvasButton(frame, event.clientX - bounds.left, event.clientY - bounds.top);
    if (index === lastPointerCellRef.current) return;

    lastPointerCellRef.current = index;
    if (index !== null) advanceCell(index);
  }, [advanceCell]);

  const handleModeClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const nextFieldMode = target.closest<HTMLButtonElement>("button[data-field-mode]")
      ?.dataset.fieldMode;
    if (nextFieldMode === "transport") {
      setFieldMode("transport");
      return;
    }

    const nextSource = target.closest<HTMLButtonElement>("button[data-pointillist-source]")
      ?.dataset.pointillistSource;
    if (nextSource && isPointillistSourceId(nextSource)) {
      setSourceId(nextSource);
      setFieldMode("pointillist");
    }
  }, []);

  return (
    <main aria-label="MP3 transport button field" className={styles.screen}>
      <canvas
        aria-label="Interactive field of black and white MP3 transport buttons"
        className={styles.buttonCanvas}
        onPointerLeave={() => {
          lastPointerCellRef.current = null;
        }}
        onPointerMove={handleCanvasPointerMove}
        ref={canvasRef}
        role="img"
      />
      <FieldModeControl
        activeSource={sourceId}
        fieldMode={fieldMode}
        onClick={handleModeClick}
      />
    </main>
  );
}
