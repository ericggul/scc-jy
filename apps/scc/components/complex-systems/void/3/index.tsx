"use client";

import { useEffect, useRef } from "react";
import styles from "./couzin-field.module.css";
import {
  DEFAULT_AGENT_COUNT,
  ORIENTATION,
  REPULSION,
  createCouzinParameters,
  createCouzinTorusSimulation,
  type CouzinTorusSimulation,
} from "./model";

const STEP_INTERVAL_MS = 1_000 / 30;
const MAX_CANVAS_PIXELS = 3_000_000;
const MAX_PIXEL_RATIO = 1.25;
const INITIAL_SEED = 0x7f4a7c15;

const PARAMETERS = createCouzinParameters();

type FieldGeometry = Readonly<{
  height: number;
  pixelRatio: number;
  scale: number;
  width: number;
}>;

type PointerPosition = Readonly<{
  x: number;
  y: number;
}>;

function nearestAgent(
  simulation: CouzinTorusSimulation,
  geometry: FieldGeometry,
  pointer: PointerPosition,
) {
  const x = (pointer.x - geometry.width / 2) / geometry.scale;
  const y = (pointer.y - geometry.height / 2) / geometry.scale;
  const maximumDistance = 22 / geometry.scale;
  const maximumDistanceSquared = maximumDistance * maximumDistance;
  let closest = -1;
  let closestDistance = maximumDistanceSquared;

  for (let index = 0; index < simulation.count; index += 1) {
    const deltaX = simulation.x[index]! - x;
    const deltaY = simulation.y[index]! - y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared < closestDistance) {
      closest = index;
      closestDistance = distanceSquared;
    }
  }

  return closest;
}

function drawZones(
  context: CanvasRenderingContext2D,
  simulation: CouzinTorusSimulation,
  selectedAgent: number,
  scale: number,
) {
  if (selectedAgent < 0) return;

  const x = simulation.x[selectedAgent]!;
  const y = simulation.y[selectedAgent]!;
  const zones = [
    { color: "#ce5544", radius: PARAMETERS.repulsionRadius, width: 1.15 },
    { color: "#4e7989", radius: PARAMETERS.orientationRadius, width: 0.9 },
    { color: "#9a7645", radius: PARAMETERS.attractionRadius, width: 0.72 },
  ] as const;

  context.save();
  context.setLineDash([3.5 / scale, 4.5 / scale]);
  for (const zone of zones) {
    context.beginPath();
    context.strokeStyle = zone.color;
    context.globalAlpha = 0.46;
    context.lineWidth = zone.width / scale;
    context.arc(x, y, zone.radius, 0, Math.PI * 2);
    context.stroke();
  }

  const inspection = simulation.inspectAgent(selectedAgent);
  context.setLineDash([]);
  context.lineCap = "round";
  for (let relation = 0; relation < inspection.count; relation += 1) {
    const target = inspection.targetIndices[relation]!;
    const kind = inspection.kinds[relation]!;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(simulation.x[target]!, simulation.y[target]!);
    context.strokeStyle =
      kind === REPULSION
        ? "#ce5544"
        : kind === ORIENTATION
          ? "#4e7989"
          : "#9a7645";
    context.globalAlpha = kind === REPULSION ? 0.9 : 0.64;
    context.lineWidth =
      (kind === REPULSION ? 1.9 : kind === ORIENTATION ? 1.25 : 0.96) / scale;
    context.stroke();
  }
  context.restore();
}

function drawAgents(
  context: CanvasRenderingContext2D,
  simulation: CouzinTorusSimulation,
  scale: number,
  selectedAgent: number,
) {
  const tailLength = 0.0084;
  const headLength = 0.0088;
  context.save();
  context.strokeStyle = "#101010";
  context.globalAlpha = 0.87;
  context.lineCap = "round";
  context.lineWidth = 2.1 / scale;
  context.beginPath();

  for (let index = 0; index < simulation.count; index += 1) {
    if (index === selectedAgent) continue;
    const x = simulation.x[index]!;
    const y = simulation.y[index]!;
    const directionX = simulation.directionX[index]!;
    const directionY = simulation.directionY[index]!;
    context.moveTo(x - directionX * tailLength, y - directionY * tailLength);
    context.lineTo(x + directionX * headLength, y + directionY * headLength);
  }
  context.stroke();

  context.fillStyle = "#101010";
  context.globalAlpha = 0.96;
  context.beginPath();
  const headRadius = 1.22 / scale;
  for (let index = 0; index < simulation.count; index += 1) {
    if (index === selectedAgent) continue;
    const x = simulation.x[index]! + simulation.directionX[index]! * headLength;
    const y = simulation.y[index]! + simulation.directionY[index]! * headLength;
    context.moveTo(x + headRadius, y);
    context.arc(x, y, headRadius, 0, Math.PI * 2);
  }
  context.fill();

  if (selectedAgent >= 0) {
    const x = simulation.x[selectedAgent]!;
    const y = simulation.y[selectedAgent]!;
    const directionX = simulation.directionX[selectedAgent]!;
    const directionY = simulation.directionY[selectedAgent]!;
    context.strokeStyle = "#050505";
    context.globalAlpha = 1;
    context.lineWidth = 3.5 / scale;
    context.beginPath();
    context.moveTo(x - directionX * tailLength, y - directionY * tailLength);
    context.lineTo(x + directionX * headLength, y + directionY * headLength);
    context.stroke();
    context.beginPath();
    context.arc(
      x + directionX * headLength,
      y + directionY * headLength,
      2.2 / scale,
      0,
      Math.PI * 2,
    );
    context.fillStyle = "#050505";
    context.fill();
  }
  context.restore();
}

function drawField(
  context: CanvasRenderingContext2D,
  geometry: FieldGeometry,
  simulation: CouzinTorusSimulation,
  selectedAgent: number,
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
    geometry.pixelRatio * geometry.width / 2,
    geometry.pixelRatio * geometry.height / 2,
  );
  drawZones(context, simulation, selectedAgent, geometry.scale);
  drawAgents(context, simulation, geometry.scale, selectedAgent);
}

export default function VoidThree() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geometryRef = useRef<FieldGeometry | null>(null);
  const simulationRef = useRef<CouzinTorusSimulation | null>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    simulationRef.current = createCouzinTorusSimulation({
      count: DEFAULT_AGENT_COUNT,
      parameters: PARAMETERS,
      seed: INITIAL_SEED,
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let motionReduced = reducedMotion.matches;
    let frameId: number | null = null;
    let resizeFrameId: number | null = null;
    let pointerFrameId: number | null = null;
    let previousStep = performance.now();
    let selectedAgent = -1;
    let pendingPointer: PointerPosition | null = null;

    const paint = () => {
      const geometry = geometryRef.current;
      const simulation = simulationRef.current;
      if (!geometry || !simulation) return;
      drawField(context, geometry, simulation, selectedAgent);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(
        MAX_PIXEL_RATIO,
        window.devicePixelRatio || 1,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height)),
      );
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      geometryRef.current = {
        height,
        pixelRatio,
        // The interaction radii remain simulation units; this is a camera-only
        // scale chosen so the annulus is read as one close observation.
        scale: Math.max(1, Math.min(width, height) * 1.22),
        width,
      };
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
      const elapsed = time - previousStep;
      if (elapsed >= STEP_INTERVAL_MS) {
        previousStep = time - (elapsed % STEP_INTERVAL_MS);
        simulationRef.current?.step(STEP_INTERVAL_MS / 1_000, PARAMETERS);
        paint();
      }
      frameId = requestAnimationFrame(animate);
    };

    const syncMotionPreference = (event: MediaQueryListEvent) => {
      motionReduced = event.matches;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      previousStep = performance.now();
      paint();
      if (!motionReduced) frameId = requestAnimationFrame(animate);
    };

    const updatePointer = () => {
      pointerFrameId = null;
      const geometry = geometryRef.current;
      const simulation = simulationRef.current;
      if (!geometry || !simulation || !pendingPointer) return;
      selectedAgent = nearestAgent(simulation, geometry, pendingPointer);
      paint();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pendingPointer = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      if (pointerFrameId === null) {
        pointerFrameId = requestAnimationFrame(updatePointer);
      }
    };

    const handlePointerLeave = () => {
      pendingPointer = null;
      selectedAgent = -1;
      paint();
    };

    const observer = new ResizeObserver(requestResize);
    observer.observe(field);
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerdown", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerleave", handlePointerLeave);
    reducedMotion.addEventListener("change", syncMotionPreference);
    resize();
    if (!motionReduced) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      reducedMotion.removeEventListener("change", syncMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      if (pointerFrameId !== null) cancelAnimationFrame(pointerFrameId);
    };
  }, []);

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="A Couzin zonal-interaction flock. The white centre has no object: it is the changing gap produced by local repulsion, orientation, and attraction. Move over a nearby moving mark to inspect only that agent's active relations."
      />
    </main>
  );
}
