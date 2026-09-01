"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./void-field.module.css";
import {
  DEFAULT_ATTRACTION_GAIN,
  DEFAULT_INTERACTION_RADIUS,
  DEFAULT_NOISE,
  MAX_ATTRACTION_GAIN,
  MAX_INTERACTION_RADIUS,
  MAX_NOISE,
  MIN_ATTRACTION_GAIN,
  MIN_INTERACTION_RADIUS,
  MIN_NOISE,
  agentCountForViewport,
  createAttractiveVicsekSimulation,
  createVicsekDomain,
  createVicsekParameters,
  type AttractiveVicsekSimulation,
  type InfluenceGraph,
  type VicsekDomain,
  type VicsekParameters,
} from "./model";

const STEP_INTERVAL_MS = 1_000 / 24;
const MAX_STEPS_PER_FRAME = 1;
const MAX_CANVAS_PIXELS = 3_000_000;
const MAX_PIXEL_RATIO = 1.25;
const FIELD_ZOOM = 1.5;
const INITIAL_SEED = 0x725f7c13;
const INITIAL_PARAMETERS = createVicsekParameters(
  DEFAULT_INTERACTION_RADIUS,
  DEFAULT_NOISE,
  DEFAULT_ATTRACTION_GAIN,
);

type FieldGeometry = {
  domain: VicsekDomain;
  pixelRatio: number;
  scale: number;
};

type StrokeBand = Readonly<{
  minimumStrength: number;
  opacity: number;
  width: number;
}>;

type RenderBuffers = {
  agentCount: number;
  agentIndices: Uint16Array;
  edgeCounts: Uint32Array;
  edgeIndices: [Uint32Array, Uint32Array, Uint32Array, Uint32Array];
};

const STROKE_BANDS: readonly StrokeBand[] = [
  { minimumStrength: 0.7, opacity: 0.78, width: 1.35 },
  { minimumStrength: 0.4, opacity: 0.48, width: 0.84 },
  { minimumStrength: 0.18, opacity: 0.27, width: 0.52 },
  { minimumStrength: 0, opacity: 0.12, width: 0.3 },
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createRenderBuffers(): RenderBuffers {
  return {
    agentCount: 0,
    agentIndices: new Uint16Array(0),
    edgeCounts: new Uint32Array(STROKE_BANDS.length),
    edgeIndices: [
      new Uint32Array(0),
      new Uint32Array(0),
      new Uint32Array(0),
      new Uint32Array(0),
    ],
  };
}

function nextCapacity(current: number, required: number) {
  return Math.max(required, Math.ceil(Math.max(64, current) * 1.5));
}

function growUint16(source: Uint16Array, required: number) {
  if (source.length >= required) return source;
  const next = new Uint16Array(nextCapacity(source.length, required));
  next.set(source);
  return next;
}

function growUint32(source: Uint32Array, required: number) {
  if (source.length >= required) return source;
  const next = new Uint32Array(nextCapacity(source.length, required));
  next.set(source);
  return next;
}

function prepareRenderBuffers(
  simulation: AttractiveVicsekSimulation,
  graph: InfluenceGraph,
  domain: VicsekDomain,
  scale: number,
  buffers: RenderBuffers,
) {
  buffers.agentIndices = growUint16(buffers.agentIndices, simulation.count);
  for (let bandIndex = 0; bandIndex < STROKE_BANDS.length; bandIndex += 1) {
    buffers.edgeIndices[bandIndex] = growUint32(
      buffers.edgeIndices[bandIndex]!,
      graph.count,
    );
  }

  const viewWidth = domain.width / FIELD_ZOOM;
  const viewHeight = domain.height / FIELD_ZOOM;
  const viewLeft = (domain.width - viewWidth) / 2;
  const viewTop = (domain.height - viewHeight) / 2;
  const viewRight = viewLeft + viewWidth;
  const viewBottom = viewTop + viewHeight;
  const agentMargin = 8 / scale;
  const edgeMargin = MAX_INTERACTION_RADIUS + agentMargin;
  let agentCount = 0;

  for (let index = 0; index < simulation.count; index += 1) {
    const x = simulation.x[index]!;
    const y = simulation.y[index]!;
    if (
      x < viewLeft - agentMargin ||
      x > viewRight + agentMargin ||
      y < viewTop - agentMargin ||
      y > viewBottom + agentMargin
    ) {
      continue;
    }

    buffers.agentIndices[agentCount] = index;
    agentCount += 1;
  }

  buffers.agentCount = agentCount;
  buffers.edgeCounts.fill(0);

  for (let edgeIndex = 0; edgeIndex < graph.count; edgeIndex += 1) {
    const source = graph.sources[edgeIndex]!;
    const target = graph.targets[edgeIndex]!;
    const sourceX = simulation.x[source]!;
    const sourceY = simulation.y[source]!;
    const targetX = simulation.x[target]!;
    const targetY = simulation.y[target]!;
    const sourceOutside =
      sourceX < viewLeft - edgeMargin ||
      sourceX > viewRight + edgeMargin ||
      sourceY < viewTop - edgeMargin ||
      sourceY > viewBottom + edgeMargin;
    const targetOutside =
      targetX < viewLeft - edgeMargin ||
      targetX > viewRight + edgeMargin ||
      targetY < viewTop - edgeMargin ||
      targetY > viewBottom + edgeMargin;
    if (sourceOutside && targetOutside) continue;

    const strength = clamp(graph.weights[edgeIndex]! / 0.8, 0, 1);
    const bandIndex = strength >= 0.7
      ? 0
      : strength >= 0.4
        ? 1
        : strength >= 0.18
          ? 2
          : 3;
    const edgeCount = buffers.edgeCounts[bandIndex]!;
    buffers.edgeIndices[bandIndex]![edgeCount] = edgeIndex;
    buffers.edgeCounts[bandIndex] = edgeCount + 1;
  }
}

function drawInfluenceEdges(
  context: CanvasRenderingContext2D,
  simulation: AttractiveVicsekSimulation,
  graph: InfluenceGraph,
  scale: number,
  buffers: RenderBuffers,
) {
  context.save();
  context.strokeStyle = "#121212";
  context.lineCap = "round";

  for (let bandIndex = 0; bandIndex < STROKE_BANDS.length; bandIndex += 1) {
    const band = STROKE_BANDS[bandIndex]!;
    const edgeIndices = buffers.edgeIndices[bandIndex]!;
    context.globalAlpha = band.opacity;
    context.lineWidth = band.width / scale;
    context.beginPath();

    for (let drawIndex = 0; drawIndex < buffers.edgeCounts[bandIndex]!; drawIndex += 1) {
      const edgeIndex = edgeIndices[drawIndex]!;
      const source = graph.sources[edgeIndex]!;
      const target = graph.targets[edgeIndex]!;
      context.moveTo(simulation.x[source]!, simulation.y[source]!);
      context.lineTo(simulation.x[target]!, simulation.y[target]!);
    }

    context.stroke();
  }

  context.restore();
}

function drawAgentDots(
  context: CanvasRenderingContext2D,
  simulation: AttractiveVicsekSimulation,
  scale: number,
  buffers: RenderBuffers,
) {
  context.save();
  context.fillStyle = "#0d0d0d";
  context.globalAlpha = 0.96;
  context.beginPath();

  for (let drawIndex = 0; drawIndex < buffers.agentCount; drawIndex += 1) {
    const index = buffers.agentIndices[drawIndex]!;
    const attractivity = simulation.attractivity[index]!;
    const directionX = simulation.directionX[index]!;
    const directionY = simulation.directionY[index]!;
    const stride = (3.8 + attractivity * 2.4) / scale;
    const radius = (1.05 + attractivity * 0.82) / scale;
    const x = simulation.x[index]! + directionX * stride * 0.44;
    const y = simulation.y[index]! + directionY * stride * 0.44;
    context.moveTo(x + radius, y);
    context.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2,
    );
  }

  context.fill();
  context.fillStyle = "#242424";
  context.globalAlpha = 0.84;
  context.beginPath();

  for (let drawIndex = 0; drawIndex < buffers.agentCount; drawIndex += 1) {
    const index = buffers.agentIndices[drawIndex]!;
    const attractivity = simulation.attractivity[index]!;
    const directionX = simulation.directionX[index]!;
    const directionY = simulation.directionY[index]!;
    const stride = (3.8 + attractivity * 2.4) / scale;
    const radius = (0.7 + attractivity * 0.45) / scale;
    const x = simulation.x[index]! - directionX * stride * 0.07;
    const y = simulation.y[index]! - directionY * stride * 0.07;
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, Math.PI * 2);
  }

  context.fill();
  context.fillStyle = "#555555";
  context.globalAlpha = 0.68;
  context.beginPath();

  for (let drawIndex = 0; drawIndex < buffers.agentCount; drawIndex += 1) {
    const index = buffers.agentIndices[drawIndex]!;
    const attractivity = simulation.attractivity[index]!;
    const directionX = simulation.directionX[index]!;
    const directionY = simulation.directionY[index]!;
    const stride = (3.8 + attractivity * 2.4) / scale;
    const radius = (0.38 + attractivity * 0.22) / scale;
    const x = simulation.x[index]! - directionX * stride * 0.5;
    const y = simulation.y[index]! - directionY * stride * 0.5;
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, Math.PI * 2);
  }

  context.fill();
  context.restore();
}

function drawField(
  context: CanvasRenderingContext2D,
  geometry: FieldGeometry,
  simulation: AttractiveVicsekSimulation,
  buffers: RenderBuffers,
) {
  const { domain, pixelRatio, scale } = geometry;
  prepareRenderBuffers(simulation, simulation.graph, domain, scale, buffers);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, context.canvas.width / pixelRatio, context.canvas.height / pixelRatio);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, context.canvas.width / pixelRatio, context.canvas.height / pixelRatio);
  const fieldScale = pixelRatio * scale;
  const centeredOffsetX = fieldScale * domain.width * (1 - FIELD_ZOOM) / 2;
  const centeredOffsetY = fieldScale * domain.height * (1 - FIELD_ZOOM) / 2;
  context.setTransform(
    fieldScale * FIELD_ZOOM,
    0,
    0,
    fieldScale * FIELD_ZOOM,
    centeredOffsetX,
    centeredOffsetY,
  );
  drawInfluenceEdges(context, simulation, simulation.graph, scale, buffers);
  drawAgentDots(context, simulation, scale, buffers);
}

export default function VoidOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geometryRef = useRef<FieldGeometry | null>(null);
  const simulationRef = useRef<AttractiveVicsekSimulation | null>(null);
  const renderBuffersRef = useRef<RenderBuffers>(createRenderBuffers());
  const parametersRef = useRef(INITIAL_PARAMETERS);
  const paintRef = useRef<(() => void) | null>(null);
  const stepRef = useRef<(() => void) | null>(null);
  const [parameters, setParameters] = useState(INITIAL_PARAMETERS);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | null = null;
    let resizeFrameId: number | null = null;
    let previousFrame = performance.now();
    let accumulator = 0;

    const paint = () => {
      const geometry = geometryRef.current;
      const simulation = simulationRef.current;
      if (!geometry || !simulation) return;
      drawField(context, geometry, simulation, renderBuffersRef.current);
    };

    const advance = (shouldPaint = true) => {
      const simulation = simulationRef.current;
      if (!simulation) return;
      simulation.step(parametersRef.current);
      if (shouldPaint) paint();
    };

    const animate = (time: number) => {
      accumulator += Math.min(66, Math.max(0, time - previousFrame));
      previousFrame = time;
      let stepCount = 0;

      while (accumulator >= STEP_INTERVAL_MS && stepCount < MAX_STEPS_PER_FRAME) {
        advance(false);
        accumulator -= STEP_INTERVAL_MS;
        stepCount += 1;
      }
      if (stepCount === MAX_STEPS_PER_FRAME) accumulator = 0;
      if (stepCount > 0) paint();
      frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const scale = Math.max(1, Math.min(bounds.width, bounds.height));
      const pixelRatio = Math.min(
        MAX_PIXEL_RATIO,
        window.devicePixelRatio || 1,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, bounds.width * bounds.height)),
      );
      const domain = createVicsekDomain(bounds.width, bounds.height);

      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      geometryRef.current = { domain, pixelRatio, scale };
      simulationRef.current = createAttractiveVicsekSimulation({
        count: agentCountForViewport(bounds.width, bounds.height),
        domain,
        seed: INITIAL_SEED,
      });
      simulationRef.current.rebuildGraph(parametersRef.current);
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

    const syncMotionPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      previousFrame = performance.now();
      accumulator = 0;
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    paintRef.current = paint;
    stepRef.current = () => advance();
    const observer = new ResizeObserver(requestResize);
    observer.observe(field);
    reducedMotion.addEventListener("change", syncMotionPreference);
    resize();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      paintRef.current = null;
      stepRef.current = null;
    };
  }, []);

  const updateParameters = (next: VicsekParameters) => {
    parametersRef.current = next;
    simulationRef.current?.rebuildGraph(next);
    setParameters(next);
    paintRef.current?.();
  };

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.controlDock}>
        <section
          id="void-controls"
          className={styles.controlPanel}
          aria-label="Attractive Vicsek field parameters"
          hidden={!controlsExpanded}
        >
          <label className={styles.parameter} htmlFor="void-noise">
            <span>noise</span>
            <input
              id="void-noise"
              className={styles.slider}
              type="range"
              min={MIN_NOISE}
              max={MAX_NOISE}
              step="0.01"
              value={parameters.noise}
              onChange={(event) =>
                updateParameters(
                  createVicsekParameters(
                    parameters.interactionRadius,
                    Number(event.target.value),
                    parameters.attractionGain,
                  ),
                )
              }
            />
            <output htmlFor="void-noise">{parameters.noise.toFixed(2)}</output>
          </label>
          <label className={styles.parameter} htmlFor="void-reach">
            <span>reach</span>
            <input
              id="void-reach"
              className={styles.slider}
              type="range"
              min={MIN_INTERACTION_RADIUS}
              max={MAX_INTERACTION_RADIUS}
              step="0.001"
              value={parameters.interactionRadius}
              onChange={(event) =>
                updateParameters(
                  createVicsekParameters(
                    Number(event.target.value),
                    parameters.noise,
                    parameters.attractionGain,
                  ),
                )
              }
            />
            <output htmlFor="void-reach">
              {parameters.interactionRadius.toFixed(3)}
            </output>
          </label>
          <label className={styles.parameter} htmlFor="void-attractivity">
            <span>attract.</span>
            <input
              id="void-attractivity"
              className={styles.slider}
              type="range"
              min={MIN_ATTRACTION_GAIN}
              max={MAX_ATTRACTION_GAIN}
              step="0.01"
              value={parameters.attractionGain}
              onChange={(event) =>
                updateParameters(
                  createVicsekParameters(
                    parameters.interactionRadius,
                    parameters.noise,
                    Number(event.target.value),
                  ),
                )
              }
            />
            <output htmlFor="void-attractivity">
              {parameters.attractionGain.toFixed(2)}
            </output>
          </label>
          <p className={styles.reading}>
            line weight = proximity × mutual attractivity
          </p>
          <button
            className={styles.stepButton}
            type="button"
            onClick={() => stepRef.current?.()}
          >
            advance
          </button>
        </section>
        <button
          className={styles.expandButton}
          type="button"
          aria-controls="void-controls"
          aria-expanded={controlsExpanded}
          onClick={() => setControlsExpanded((current) => !current)}
        >
          {controlsExpanded ? "close" : "adjust"}
        </button>
      </div>
    </main>
  );
}
