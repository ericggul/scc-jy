"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { CValGraphCell, CValGraphTone } from "./presenter";

type PlotBounds = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type PlotSeries = {
  cell: CValGraphCell;
  from: readonly number[];
  to: readonly number[];
  minimum: number;
  range: number;
};

type PlotAnimation = {
  series: Map<string, PlotSeries>;
  startedAt: number;
  durationMs: number;
};

const plotColours: Record<CValGraphTone, string> = {
  positive: "#20bd68",
  negative: "#e94a58",
  amber: "#f0a000",
  cyan: "#45acc7",
  neutral: "#e6e5dd",
};

function valuesMatch(left: readonly number[] | undefined, right: readonly number[] | undefined) {
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function easedProgress(animation: PlotAnimation, now: number) {
  if (animation.durationMs <= 0) return 1;
  const progress = Math.min(1, Math.max(0, (now - animation.startedAt) / animation.durationMs));
  return 1 - (1 - progress) ** 3;
}

function valueAt(series: PlotSeries, index: number, progress: number) {
  const target = series.to[index] ?? 0;
  const start = series.from[index] ?? target;
  return start + (target - start) * progress;
}

function makeSeries(cell: CValGraphCell, from: readonly number[]) {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < cell.values.length; index += 1) {
    const target = cell.values[index] ?? 0;
    const source = from[index] ?? target;
    minimum = Math.min(minimum, source, target);
    maximum = Math.max(maximum, source, target);
  }
  minimum = Number.isFinite(minimum) ? minimum : 0;
  maximum = Number.isFinite(maximum) ? maximum : minimum;
  return {
    cell,
    from,
    to: cell.values,
    minimum,
    range: Math.max(maximum - minimum, Math.abs(maximum) * 0.001, 0.01),
  } satisfies PlotSeries;
}

function drawPlot(
  context: CanvasRenderingContext2D,
  bounds: PlotBounds,
  series: PlotSeries,
  progress: number,
) {
  const length = series.to.length;
  if (length === 0 || bounds.right <= bounds.left || bounds.bottom <= bounds.top) return;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const insetX = Math.min(3, width * 0.045);
  const insetY = Math.min(3, height * 0.09);
  const availableWidth = width - insetX * 2;
  const availableHeight = height - insetY * 2;
  const x = (index: number) => bounds.left + insetX + index / Math.max(1, length - 1) * availableWidth;
  const y = (value: number) => bounds.bottom - insetY - (value - series.minimum) / series.range * availableHeight;

  context.strokeStyle = "#252924";
  context.lineWidth = 0.55;
  for (const ratio of [1 / 3, 2 / 3]) {
    const guide = bounds.top + insetY + availableHeight * ratio;
    context.beginPath();
    context.moveTo(bounds.left + insetX, guide);
    context.lineTo(bounds.right - insetX, guide);
    context.stroke();
  }

  const colour = plotColours[series.cell.tone];
  context.strokeStyle = colour;
  context.lineWidth = 1.15;
  context.lineJoin = "round";
  context.lineCap = "square";
  context.beginPath();
  for (let index = 0; index < length; index += 1) {
    const pointX = x(index);
    const pointY = y(valueAt(series, index, progress));
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.stroke();

  context.fillStyle = colour;
  context.fillRect(x(length - 1) - 1.25, y(valueAt(series, length - 1, progress)) - 1.25, 2.5, 2.5);
}

/**
 * One canvas owns all 100 micrographs. Snapshot work is performed once when
 * data changes; paint frames only interpolate scalar values and draw. The
 * canvas deliberately stops at 30 fps because 100 small market paths are
 * perceptually continuous there while keeping input and socket rendering free.
 */
export default function CValGraphPlotCanvas({
  cells,
  matrixRef,
  transitionMs,
}: {
  cells: readonly CValGraphCell[];
  matrixRef: RefObject<HTMLDivElement | null>;
  transitionMs: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef<PlotBounds[]>([]);
  const animationRef = useRef<PlotAnimation | null>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const pixelRatioRef = useRef(1);
  const lastPaintAtRef = useRef(0);

  const drawAt = useCallback((now = performance.now()) => {
    const canvas = canvasRef.current;
    const animation = animationRef.current;
    if (!canvas || !animation || boundsRef.current.length === 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const pixelRatio = pixelRatioRef.current;
    const width = canvas.width / pixelRatio;
    const height = canvas.height / pixelRatio;
    const progress = easedProgress(animation, now);

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    for (const bounds of boundsRef.current) {
      const series = animation.series.get(bounds.id);
      if (series) drawPlot(context, bounds, series, progress);
    }
  }, []);

  const requestFrame = useCallback(() => {
    if (frameRef.current != null) return;
    const render = (now: number) => {
      frameRef.current = null;
      const animation = animationRef.current;
      if (!animation) return;
      const complete = now - animation.startedAt >= animation.durationMs;
      if (complete || now - lastPaintAtRef.current >= 33) {
        drawAt(now);
        lastPaintAtRef.current = now;
      }
      if (!complete) frameRef.current = window.requestAnimationFrame(render);
    };
    frameRef.current = window.requestAnimationFrame(render);
  }, [drawAt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const matrix = matrixRef.current;
    if (!canvas || !matrix) return;

    const measure = () => {
      const matrixBounds = matrix.getBoundingClientRect();
      // Individual 10×10 plots do not gain visible information at a 2× backing
      // surface. The cap cuts a full-field repaint by more than half on Retina.
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      pixelRatioRef.current = pixelRatio;
      canvas.width = Math.max(1, Math.round(matrixBounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(matrixBounds.height * pixelRatio));
      const nodes = Array.from(matrix.querySelectorAll<HTMLElement>("[data-graph-cell]"));
      boundsRef.current = nodes.map((node) => {
        const cellBounds = node.getBoundingClientRect();
        const headerBounds = node.querySelector("header")?.getBoundingClientRect();
        const footerBounds = node.querySelector("footer")?.getBoundingClientRect();
        return {
          id: node.dataset.graphCell ?? "",
          left: cellBounds.left - matrixBounds.left,
          right: cellBounds.right - matrixBounds.left,
          top: (headerBounds?.bottom ?? cellBounds.top) - matrixBounds.top,
          bottom: (footerBounds?.top ?? cellBounds.bottom) - matrixBounds.top,
        };
      });
      drawAt();
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => { reducedMotionRef.current = motionQuery.matches; };
    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);
    const observer = new ResizeObserver(measure);
    observer.observe(matrix);
    measure();
    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", updateMotionPreference);
    };
  }, [drawAt, matrixRef]);

  useEffect(() => {
    const now = performance.now();
    const prior = animationRef.current;
    const priorProgress = prior ? easedProgress(prior, now) : 1;
    let changed = false;
    const series = new Map<string, PlotSeries>();

    for (const cell of cells) {
      const previous = prior?.series.get(cell.id);
      const from = previous
        ? cell.values.map((value, index) => valueAt(previous, index, priorProgress))
        : cell.values;
      if (!valuesMatch(from, cell.values)) changed = true;
      series.set(cell.id, makeSeries(cell, from));
    }

    animationRef.current = {
      series,
      startedAt: now,
      durationMs: changed && !reducedMotionRef.current ? transitionMs : 0,
    };
    drawAt(now);
    if (changed && !reducedMotionRef.current) requestFrame();
  }, [cells, drawAt, requestFrame, transitionMs]);

  useEffect(() => () => {
    if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return <canvas className="graphPlotCanvas" ref={canvasRef} aria-hidden="true" />;
}
