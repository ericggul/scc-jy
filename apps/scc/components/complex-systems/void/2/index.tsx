"use client";

import { useEffect, useRef } from "react";
import styles from "./territory-field.module.css";
import {
  DEFAULT_AGENT_COUNT,
  MAX_RING_COUNT,
  createInfluenceDomain,
  createInfluenceSimulation,
  type InfluenceSimulation,
} from "./model";

const STEP_INTERVAL_MS = 1_000 / 30;
const MAX_STEPS_PER_FRAME = 2;
const MAX_CANVAS_PIXELS = 4_000_000;
const INITIAL_SEED = 0x5d2a8391;
const RELATIONSHIP_BANDS = [
  {
    minimumStrength: 0.62,
    maximumStrength: Infinity,
    opacity: 0.42,
    width: 1.75,
  },
  {
    minimumStrength: 0.42,
    maximumStrength: 0.62,
    opacity: 0.25,
    width: 1.2,
  },
  {
    minimumStrength: 0,
    maximumStrength: 0.42,
    opacity: 0.14,
    width: 0.76,
  },
] as const;

type FieldGeometry = Readonly<{
  height: number;
  pixelRatio: number;
  scale: number;
  width: number;
}>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function drawRelationships(
  context: CanvasRenderingContext2D,
  geometry: FieldGeometry,
  simulation: InfluenceSimulation,
) {
  const { relationships } = simulation;
  const { width, height } = simulation.domain;

  context.strokeStyle = "#121212";
  context.globalCompositeOperation = "source-over";
  context.lineCap = "round";

  for (const band of RELATIONSHIP_BANDS) {
    context.beginPath();

    for (let edge = 0; edge < relationships.count; edge += 1) {
      const strength = relationships.strengths[edge]!;
      if (
        strength < band.minimumStrength ||
        strength >= band.maximumStrength
      ) {
        continue;
      }
      const source = relationships.sources[edge]!;
      const target = relationships.targets[edge]!;
      const sourceX = simulation.x[source]!;
      const sourceY = simulation.y[source]!;
      const targetX = simulation.x[target]!;
      const targetY = simulation.y[target]!;

      // The field is periodic, but its canvas is not: suppress a seam-spanning
      // chord rather than draw a misleading line across the entire paper.
      if (
        Math.abs(targetX - sourceX) > width / 2 ||
        Math.abs(targetY - sourceY) > height / 2
      ) {
        continue;
      }

      context.moveTo(sourceX, sourceY);
      context.lineTo(targetX, targetY);
    }

    context.globalAlpha = band.opacity;
    context.lineWidth = band.width / geometry.scale;
    context.stroke();
  }
}

function drawField(
  context: CanvasRenderingContext2D,
  geometry: FieldGeometry,
  simulation: InfluenceSimulation,
) {
  context.setTransform(geometry.pixelRatio, 0, 0, geometry.pixelRatio, 0, 0);
  context.clearRect(0, 0, geometry.width, geometry.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, geometry.width, geometry.height);
  context.setTransform(
    geometry.pixelRatio * geometry.scale,
    0,
    0,
    geometry.pixelRatio * geometry.scale,
    0,
    0,
  );

  drawRelationships(context, geometry, simulation);

  const ringGap = clamp(geometry.scale * 0.0061, 2.5, 6.3) / geometry.scale;
  context.strokeStyle = "#121212";
  context.lineWidth = 0.9 / geometry.scale;
  context.globalAlpha = 0.82;
  context.globalCompositeOperation = "multiply";

  for (let ring = 1; ring <= MAX_RING_COUNT; ring += 1) {
    context.beginPath();
    for (let agent = 0; agent < simulation.count; agent += 1) {
      if (simulation.ringCount[agent]! < ring) continue;
      context.moveTo(simulation.x[agent]! + ring * ringGap, simulation.y[agent]!);
      context.arc(
        simulation.x[agent]!,
        simulation.y[agent]!,
        ring * ringGap,
        0,
        Math.PI * 2,
      );
    }
    context.stroke();
  }

  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.fillStyle = "#121212";
  context.beginPath();
  const pointRadius = 2.1 / geometry.scale;

  for (let agent = 0; agent < simulation.count; agent += 1) {
    context.moveTo(simulation.x[agent]! + pointRadius, simulation.y[agent]!);
    context.arc(
      simulation.x[agent]!,
      simulation.y[agent]!,
      pointRadius,
      0,
      Math.PI * 2,
    );
  }

  context.fill();
}

export default function VoidTwo() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geometryRef = useRef<FieldGeometry | null>(null);
  const simulationRef = useRef<InfluenceSimulation | null>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let motionReduced = reducedMotion.matches;
    let frameId: number | null = null;
    let resizeFrameId: number | null = null;
    let previousFrame = performance.now();
    let accumulator = 0;

    const paint = () => {
      const geometry = geometryRef.current;
      const simulation = simulationRef.current;
      if (!geometry || !simulation) return;
      drawField(context, geometry, simulation);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(
        1.5,
        window.devicePixelRatio || 1,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height)),
      );

      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      geometryRef.current = {
        height,
        pixelRatio,
        scale: Math.max(1, Math.min(width, height)),
        width,
      };
      simulationRef.current = createInfluenceSimulation({
        count: DEFAULT_AGENT_COUNT,
        domain: createInfluenceDomain(width, height),
        seed: INITIAL_SEED,
      });
      accumulator = 0;
      paint();
    };

    const requestResize = () => {
      if (resizeFrameId !== null) return;
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = null;
        resize();
      });
    };

    const animate = (time: number) => {
      accumulator += Math.min(66, Math.max(0, time - previousFrame));
      previousFrame = time;
      let steps = 0;

      while (accumulator >= STEP_INTERVAL_MS && steps < MAX_STEPS_PER_FRAME) {
        simulationRef.current?.step(STEP_INTERVAL_MS / 1_000);
        accumulator -= STEP_INTERVAL_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
      if (steps > 0) paint();
      frameId = requestAnimationFrame(animate);
    };

    const syncMotionPreference = (event: MediaQueryListEvent) => {
      motionReduced = event.matches;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      accumulator = 0;
      previousFrame = performance.now();
      paint();
      if (!motionReduced) frameId = requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(requestResize);
    observer.observe(field);
    reducedMotion.addEventListener("change", syncMotionPreference);
    resize();
    if (!motionReduced) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
    };
  }, []);

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Three hundred moving points. Each node's exact concentric-circle count is its influence, and thin lines connect its strongest current relationships. A small minority carries many rings while most carry one."
      />
    </main>
  );
}
