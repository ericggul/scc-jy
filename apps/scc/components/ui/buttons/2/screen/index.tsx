"use client";

import type { MouseEvent, PointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./linkedin-connection-field.module.css";
import {
  drawCanvasCell,
  drawCanvasField,
  getCanvasGridSize,
  hitTestCanvasButton,
  prepareCanvas,
  resizeStateBuffer,
  type CanvasFieldMode,
  type CanvasFrame,
  type CanvasGridSize,
  type CanvasPaletteMode,
} from "./button-canvas";
import {
  getPointillistSource,
  isPointillistSourceId,
  loadPointillistImage,
  pointillistSources,
  samplePointillistImage,
  type PointillistDot,
  type PointillistSourceId,
} from "./pointillist";

type FieldMode = "relationship" | "pointillist";
type PointillistSample = {
  columns: number;
  dots: readonly PointillistDot[];
  rows: number;
  sourceId: PointillistSourceId;
};

const INITIAL_GRID_SIZE: CanvasGridSize = { columns: 1, rows: 1 };

const paletteModes = [
  {
    id: "three",
    label: "3",
    swatches: [styles.swatchBlue, styles.swatchGray, styles.swatchDeepBlue],
  },
  {
    id: "ten",
    label: "10",
    swatches: [
      styles.swatchBlue,
      styles.swatchCoral,
      styles.swatchOchre,
      styles.swatchGreen,
      styles.swatchViolet,
      styles.swatchSky,
      styles.swatchMagenta,
      styles.swatchBrick,
      styles.swatchTeal,
      styles.swatchInk,
    ],
  },
] as const;

const FieldModeControl = memo(function FieldModeControl({
  activeMode,
  activeSource,
  fieldMode,
  onClick,
}: {
  activeMode: CanvasPaletteMode;
  activeSource: PointillistSourceId;
  fieldMode: FieldMode;
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      aria-label="Button field mode"
      className={styles.paletteControl}
      onClick={onClick}
      role="group"
    >
      <span className={styles.paletteModes}>
        {paletteModes.map((mode) => (
          <button
            aria-label={`${mode.label}-color mode`}
            aria-pressed={fieldMode === "relationship" && mode.id === activeMode}
            className={styles.paletteMode}
            data-palette-mode={mode.id}
            key={mode.id}
            type="button"
          >
            <span
              aria-hidden="true"
              className={mode.id === "three" ? styles.threePreview : styles.tenPreview}
            >
              {mode.swatches.map((swatch, index) => (
                <i className={`${styles.swatch} ${swatch}`} key={`${mode.id}-${index}`} />
              ))}
            </span>
            <span>{mode.label}</span>
          </button>
        ))}
      </span>
      <span className={styles.pointillistSources}>
        {pointillistSources.map((source) => (
          <button
            aria-label={`${source.label} pointillist`}
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

export function LinkedInConnectionField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<CanvasFrame | null>(null);
  const statesRef = useRef<Uint8Array<ArrayBufferLike>>(new Uint8Array(1));
  const lastPointerCellRef = useRef<number | null>(null);
  const [gridSize, setGridSize] = useState<CanvasGridSize>(INITIAL_GRID_SIZE);
  const [paletteMode, setPaletteMode] = useState<CanvasPaletteMode>("three");
  const [fieldMode, setFieldMode] = useState<FieldMode>("relationship");
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
      && pointillistSample.dots.length === buttonCount,
  );
  const activeDots = isPointillistReady ? pointillistSample?.dots : undefined;
  const renderMode: CanvasFieldMode = fieldMode === "pointillist" && isPointillistReady
    ? "pointillist"
    : "relationship";

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
        dots: samplePointillistImage(
          pointillistSource,
          pointillistImage,
          gridSize.columns,
          gridSize.rows,
        ),
        rows: gridSize.rows,
        sourceId,
      });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [gridSize, loadedSourceId, pointillistImage, pointillistSource, sourceId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const surface = prepareCanvas(canvas);
    if (!surface) return;

    statesRef.current = resizeStateBuffer(statesRef.current, buttonCount);
    const frame: CanvasFrame = {
      context: surface.context,
      dots: activeDots,
      fieldMode: renderMode,
      gridSize,
      height: surface.height,
      paletteMode,
      width: surface.width,
    };
    frameRef.current = frame;
    drawCanvasField(frame, statesRef.current);
  }, [activeDots, buttonCount, gridSize, paletteMode, renderMode]);

  const advanceCell = useCallback((index: number) => {
    const frame = frameRef.current;
    if (!frame) return;

    const states = statesRef.current;
    states[index] = ((states[index] ?? 0) + 1) % 3;
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

    const nextMode = target.closest<HTMLButtonElement>("button[data-palette-mode]")
      ?.dataset.paletteMode;
    if (nextMode === "three" || nextMode === "ten") {
      setPaletteMode(nextMode);
      setFieldMode("relationship");
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
    <main aria-label="LinkedIn connection button field" className={styles.screen}>
      <canvas
        aria-label="Interactive field of LinkedIn connection buttons"
        className={styles.buttonCanvas}
        onPointerLeave={() => {
          lastPointerCellRef.current = null;
        }}
        onPointerMove={handleCanvasPointerMove}
        ref={canvasRef}
        role="img"
      />
      <FieldModeControl
        activeMode={paletteMode}
        activeSource={sourceId}
        fieldMode={fieldMode}
        onClick={handleModeClick}
      />
    </main>
  );
}
