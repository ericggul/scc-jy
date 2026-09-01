"use client";

import { useCallback, useEffect, useRef } from "react";
import styles from "./screen.module.css";
import {
  createFieldSource,
  fieldVectorAt,
  retainLiveSources,
  type FieldSource,
  type GestureSample,
} from "./model";
import {
  type FieldGestureSignal,
  useFingerSkatingFieldSocket,
} from "./transport/use-field-socket";

const maximumPixelRatio = 1.5;

type ScreenSize = {
  height: number;
  width: number;
};

function drawVector(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  vector: { x: number; y: number },
  aspectRatio: number,
) {
  const screenVector = { x: vector.x / aspectRatio, y: vector.y };
  const magnitude = Math.hypot(screenVector.x, screenVector.y);
  if (magnitude < 0.0001) return;

  const directionX = screenVector.x / magnitude;
  const directionY = screenVector.y / magnitude;
  const scale = 1 - Math.exp(-magnitude * 0.035);
  const length = 11 + 24 * scale;
  const head = 4 + scale;
  const normalX = -directionY;
  const normalY = directionX;
  const startX = x - directionX * length * 0.44;
  const startY = y - directionY * length * 0.44;
  const endX = x + directionX * length * 0.56;
  const endY = y + directionY * length * 0.56;

  context.lineWidth = 1.3 + scale * 1.1;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.moveTo(
    endX - directionX * head + normalX * head * 0.62,
    endY - directionY * head + normalY * head * 0.62,
  );
  context.lineTo(endX, endY);
  context.lineTo(
    endX - directionX * head - normalX * head * 0.62,
    endY - directionY * head - normalY * head * 0.62,
  );
  context.stroke();
}

function drawField({
  context,
  now,
  size,
  sources,
}: {
  context: CanvasRenderingContext2D;
  now: number;
  size: ScreenSize;
  sources: FieldSource[];
}) {
  const { height, width } = size;
  const aspectRatio = width / Math.max(height, 1);
  const spacing = Math.min(42, Math.max(20, Math.min(width, height) * 0.038));

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f3f1eb";
  context.fillRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 0.8;
  context.strokeStyle = "#201f1b";

  for (let y = spacing * 0.5; y < height; y += spacing) {
    for (let x = spacing * 0.5; x < width; x += spacing) {
      const vector = fieldVectorAt({
        aspectRatio,
        now,
        point: { x: x / width, y: y / height },
        sources,
      });
      drawVector(context, x, y, vector, aspectRatio);
    }
  }
}

export default function FingerSkatingFieldOneScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<Map<string, GestureSample>>(new Map());
  const sizeRef = useRef<ScreenSize>({ height: 0, width: 0 });
  const sourcesRef = useRef(new Map<string, FieldSource>());

  const handleGesture = useCallback((signal: FieldGestureSignal) => {
    const pointerKey = `${signal.from}:${signal.pointerId}`;
    const receivedAt = performance.now();
    const nextSample: GestureSample = {
      controlId: signal.controlId,
      id: signal.id,
      phase: signal.phase,
      position: { x: signal.x, y: signal.y },
      receivedAt,
    };
    const previousSample = samplesRef.current.get(pointerKey);
    const source = createFieldSource(previousSample, nextSample);

    if (source) sourcesRef.current.set(pointerKey, source);
    if (signal.phase === "end") {
      samplesRef.current.delete(pointerKey);
      return;
    }
    samplesRef.current.set(pointerKey, nextSample);
  }, []);

  useFingerSkatingFieldSocket({ role: "screen", onGesture: handleGesture });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let frameId: number | null = null;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      sizeRef.current = { width, height };
    };

    const render = (frameTime: number) => {
      const { width, height } = sizeRef.current;
      if (width > 0 && height > 0) {
        const sources = retainLiveSources(
          [...sourcesRef.current.values()],
          frameTime,
        );
        sourcesRef.current = new Map(
          [...sourcesRef.current].filter(([, source]) =>
            sources.includes(source),
          ),
        );
        drawField({
          context,
          now: frameTime,
          size: sizeRef.current,
          sources,
        });
      }
      frameId = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frameId = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        aria-label="A physical vector field whose sampled vectors are changed by finger skating on a connected mobile device."
        className={styles.canvas}
        role="img"
      />
    </main>
  );
}
