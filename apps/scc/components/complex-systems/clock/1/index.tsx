"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./recursive-clock.module.css";
import {
  CLOCK_RECURSION_DEPTH,
  DEFAULT_CHILD_RADIUS_RATIO,
  MAX_CHILD_RADIUS_RATIO,
  MIN_CHILD_RADIUS_RATIO,
  SIMULATED_SECONDS_PER_SECOND,
  createClockTree,
  localClockSeconds,
  rootClockRadiusForViewport,
  type ClockHandId,
  type ClockTree,
} from "./model";

const MAX_INTERACTIVE_RECURSION_DEPTH = 6;

const HAND_COLOURS: Record<ClockHandId, string> = {
  hour: "#d2a64c",
  minute: "#f0eadf",
  second: "#c96a58",
};

function drawClockFace(
  context: CanvasRenderingContext2D,
  clock: ClockTree["clocks"][number],
) {
  const { center, radius, depth } = clock;
  const opacity = Math.max(0.22, 0.72 - depth * 0.1);
  const rimWidth = Math.max(0.55, Math.min(1.35, radius * 0.008));

  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = "#e7dfd2";
  context.lineWidth = rimWidth;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();

  if (radius >= 18) {
    context.lineCap = "butt";
    for (let index = 0; index < 12; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 12;
      const tickLength = radius * (index % 3 === 0 ? 0.1 : 0.06);
      context.globalAlpha = index % 3 === 0 ? opacity : opacity * 0.72;
      context.lineWidth = index % 3 === 0 ? rimWidth : Math.max(0.45, rimWidth * 0.7);
      context.beginPath();
      context.moveTo(
        center.x + Math.cos(angle) * (radius - tickLength),
        center.y + Math.sin(angle) * (radius - tickLength),
      );
      context.lineTo(
        center.x + Math.cos(angle) * (radius - rimWidth),
        center.y + Math.sin(angle) * (radius - rimWidth),
      );
      context.stroke();
    }
  }
  context.restore();
}

function drawClockHands(
  context: CanvasRenderingContext2D,
  clock: ClockTree["clocks"][number],
) {
  const opacity = Math.max(0.32, 0.96 - clock.depth * 0.1);
  context.save();
  context.lineCap = "round";

  for (const hand of clock.hands) {
    const baseWidth = hand.id === "hour"
      ? clock.radius * 0.035
      : hand.id === "minute"
        ? clock.radius * 0.023
        : clock.radius * 0.012;
    context.strokeStyle = HAND_COLOURS[hand.id];
    context.globalAlpha = opacity;
    context.lineWidth = Math.max(0.55, Math.min(3.4, baseWidth));
    context.beginPath();
    context.moveTo(clock.center.x, clock.center.y);
    context.lineTo(hand.tip.x, hand.tip.y);
    context.stroke();
  }

  context.fillStyle = "#f0eadf";
  context.globalAlpha = opacity;
  context.beginPath();
  context.arc(
    clock.center.x,
    clock.center.y,
    Math.max(0.8, Math.min(2.8, clock.radius * 0.02)),
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawClockTree(
  context: CanvasRenderingContext2D,
  tree: ClockTree,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);

  for (let index = tree.clocks.length - 1; index >= 0; index -= 1) {
    drawClockFace(context, tree.clocks[index]!);
  }
  for (const clock of tree.clocks) drawClockHands(context, clock);
}

function recordClockTraces(
  context: CanvasRenderingContext2D,
  tree: ClockTree,
  previousCenters: Map<string, { x: number; y: number }>,
) {
  context.save();
  context.lineCap = "round";

  for (const clock of tree.clocks) {
    if (!clock.parentId || !clock.attachedTo) continue;
    const previousCenter = previousCenters.get(clock.id);
    if (previousCenter) {
      context.strokeStyle = HAND_COLOURS[clock.attachedTo];
      context.globalAlpha = Math.max(0.018, 0.1 - clock.depth * 0.014);
      context.lineWidth = Math.max(0.45, Math.min(1.25, clock.radius * 0.009));
      context.beginPath();
      context.moveTo(previousCenter.x, previousCenter.y);
      context.lineTo(clock.center.x, clock.center.y);
      context.stroke();
    }
    previousCenters.set(clock.id, clock.center);
  }
  context.restore();
}

export default function RecursiveClockOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ratioRef = useRef(DEFAULT_CHILD_RADIUS_RATIO);
  const recursionDepthRef = useRef(CLOCK_RECURSION_DEPTH);
  const traceEnabledRef = useRef(false);
  const paintRef = useRef<(() => void) | null>(null);
  const clearTraceRef = useRef<(() => void) | null>(null);
  const [childRadiusRatio, setChildRadiusRatio] = useState(
    DEFAULT_CHILD_RADIUS_RATIO,
  );
  const [recursionDepth, setRecursionDepth] = useState(CLOCK_RECURSION_DEPTH);
  const [traceEnabled, setTraceEnabled] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  useEffect(() => {
    ratioRef.current = childRadiusRatio;
    clearTraceRef.current?.();
    paintRef.current?.();
  }, [childRadiusRatio]);

  useEffect(() => {
    recursionDepthRef.current = recursionDepth;
    clearTraceRef.current?.();
    paintRef.current?.();
  }, [recursionDepth]);

  useEffect(() => {
    traceEnabledRef.current = traceEnabled;
    clearTraceRef.current?.();
    paintRef.current?.();
  }, [traceEnabled]);

  useEffect(() => {
    const field = fieldRef.current;
    const traceCanvas = traceCanvasRef.current;
    const canvas = canvasRef.current;
    if (!field || !traceCanvas || !canvas) return;
    const traceContext = traceCanvas.getContext("2d");
    const context = canvas.getContext("2d");
    if (!traceContext || !context) return;

    let viewport = { width: 0, height: 0 };
    let frameId: number | null = null;
    let elapsedSeconds = localClockSeconds(new Date());
    let previousFrame = performance.now();
    const previousTraceCenters = new Map<string, { x: number; y: number }>();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clearTrace = () => {
      traceContext.clearRect(0, 0, viewport.width, viewport.height);
      previousTraceCenters.clear();
    };

    const paint = () => {
      if (viewport.width === 0 || viewport.height === 0) return;
      const tree = createClockTree({
        center: { x: viewport.width / 2, y: viewport.height / 2 },
        rootRadius: rootClockRadiusForViewport(
          viewport.width,
          viewport.height,
        ),
        childRadiusRatio: ratioRef.current,
        recursionDepth: recursionDepthRef.current,
        elapsedSeconds,
      });
      if (traceEnabledRef.current) {
        recordClockTraces(traceContext, tree, previousTraceCenters);
      }
      drawClockTree(context, tree, viewport.width, viewport.height);
    };

    const animate = (time: number) => {
      elapsedSeconds += (time - previousFrame) / 1000 * SIMULATED_SECONDS_PER_SECOND;
      previousFrame = time;
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      viewport = { width: bounds.width, height: bounds.height };
      const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
      traceCanvas.width = Math.round(bounds.width * deviceRatio);
      traceCanvas.height = Math.round(bounds.height * deviceRatio);
      canvas.width = Math.round(bounds.width * deviceRatio);
      canvas.height = Math.round(bounds.height * deviceRatio);
      traceContext.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      clearTrace();
      paint();
    };

    const handleMotionPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      previousFrame = performance.now();
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    paintRef.current = paint;
    clearTraceRef.current = clearTrace;
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    reducedMotion.addEventListener("change", handleMotionPreference);
    resize();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      paintRef.current = null;
      clearTraceRef.current = null;
    };
  }, []);

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={traceCanvasRef}
        className={styles.traceCanvas}
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.controlDock}>
        <div
          id="clock-controls"
          className={styles.controlPanel}
          hidden={!controlsExpanded}
        >
          <label className={styles.parameter} htmlFor="clock-radius-ratio">
            <span>scale</span>
            <input
              id="clock-radius-ratio"
              className={styles.slider}
              type="range"
              min={MIN_CHILD_RADIUS_RATIO}
              max={MAX_CHILD_RADIUS_RATIO}
              step="0.01"
              value={childRadiusRatio}
              onChange={(event) => setChildRadiusRatio(Number(event.target.value))}
            />
            <output htmlFor="clock-radius-ratio">
              {childRadiusRatio.toFixed(2)}
            </output>
          </label>
          <label className={styles.parameter} htmlFor="clock-recursion-depth">
            <span>depth</span>
            <input
              id="clock-recursion-depth"
              className={styles.slider}
              type="range"
              min="1"
              max={MAX_INTERACTIVE_RECURSION_DEPTH}
              step="1"
              value={recursionDepth}
              onChange={(event) => setRecursionDepth(Number(event.target.value))}
            />
            <output htmlFor="clock-recursion-depth">{recursionDepth}</output>
          </label>
          <button
            className={styles.traceButton}
            type="button"
            aria-pressed={traceEnabled}
            onClick={() => setTraceEnabled((current) => !current)}
          >
            trace {traceEnabled ? "on" : "off"}
          </button>
        </div>
        <button
          className={styles.expandButton}
          type="button"
          aria-controls="clock-controls"
          aria-expanded={controlsExpanded}
          onClick={() => setControlsExpanded((current) => !current)}
        >
          {controlsExpanded ? "collapse" : "expand"}
        </button>
      </div>
    </main>
  );
}
