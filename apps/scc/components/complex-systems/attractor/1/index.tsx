"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./attractor-atlas.module.css";
import {
  ATTRACTOR_DEFINITIONS,
  MAX_PARTICLE_COUNT,
  createAttractorParticleStates,
  createAttractorTraces,
  stepAttractorParticleStates,
  type AttractorId,
  type AttractorParticleState,
  type AttractorTrace,
  type PhasePoint,
} from "./model";

type FieldSize = {
  width: number;
  height: number;
};

type Panel = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PointerOrbit = {
  x: number;
  y: number;
  active: boolean;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

type ViewRotation = {
  yawCosine: number;
  yawSine: number;
  pitchCosine: number;
  pitchSine: number;
};

const DISPLAY_ORDER = ATTRACTOR_DEFINITIONS.map((definition) => definition.id);
const TAU = Math.PI * 2;
const MAX_TRAIL_POINTS = 360;
const TRAIL_CAPTURE_INTERVAL = 3;
const SIMULATION_SECONDS_PER_SECOND = 2.4;
const MAX_INTEGRATION_STEPS_PER_FRAME = 32;
const MAX_CANVAS_PIXELS = 8_000_000;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function wrappedIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function particleColour(index: number) {
  const hue = (8 + index * 137.508) % 360;
  return `hsl(${hue.toFixed(1)} 38% 67%)`;
}

function rotationFor(yaw: number, pitch: number): ViewRotation {
  return {
    yawCosine: Math.cos(yaw),
    yawSine: Math.sin(yaw),
    pitchCosine: Math.cos(pitch),
    pitchSine: Math.sin(pitch),
  };
}

function panelFor(width: number, height: number): Panel {
  const inset = clamp(Math.min(width, height) * 0.025, 14, 32);
  return {
    x: inset,
    y: inset,
    width: Math.max(1, width - inset * 2),
    height: Math.max(1, height - inset * 2),
  };
}

function projectPoint(
  point: PhasePoint,
  trace: AttractorTrace,
  panel: Panel,
  rotation: ViewRotation,
): ProjectedPoint {
  const normalizedX = (point.x - trace.center.x) / trace.radius;
  const normalizedY = (point.y - trace.center.y) / trace.radius;
  const normalizedZ = (point.z - trace.center.z) / trace.radius;
  const { yawCosine, yawSine, pitchCosine, pitchSine } = rotation;
  const rotatedX = normalizedX * yawCosine - normalizedZ * yawSine;
  const rotatedZ = normalizedX * yawSine + normalizedZ * yawCosine;
  const rotatedY = normalizedY * pitchCosine - rotatedZ * pitchSine;
  const depth = normalizedY * pitchSine + rotatedZ * pitchCosine;
  const scale = 0.92 / (1.34 - depth * 0.2);
  const extent = Math.min(panel.width, panel.height) * 0.42;

  return {
    x: panel.x + panel.width / 2 + rotatedX * extent * scale,
    y: panel.y + panel.height / 2 - rotatedY * extent * scale,
  };
}

function drawSpan(
  context: CanvasRenderingContext2D,
  points: readonly PhasePoint[],
  projectionTrace: AttractorTrace,
  panel: Panel,
  start: number,
  count: number,
  stride: number,
  rotation: ViewRotation,
) {
  if (points.length === 0 || count <= 0) return;
  let previousIndex = -1;
  context.beginPath();

  for (let offset = 0; offset <= count; offset += stride) {
    const index = wrappedIndex(start + offset, points.length);
    const current = points[index];
    if (!current) continue;
    const projected = projectPoint(current, projectionTrace, panel, rotation);
    const didWrap = previousIndex >= 0 && index < previousIndex;
    if (offset === 0 || didWrap) context.moveTo(projected.x, projected.y);
    else context.lineTo(projected.x, projected.y);
    previousIndex = index;
  }
  context.stroke();
}

function drawAttractor(
  context: CanvasRenderingContext2D,
  trace: AttractorTrace,
  particleTrails: readonly (readonly PhasePoint[])[],
  particleCount: number,
  panel: Panel,
  time: number,
  attractorIndex: number,
  orbitOffset: number,
) {
  const yaw = time * 0.000075 + attractorIndex * 0.62 + orbitOffset;
  const pitch = 0.42 + Math.sin(time * 0.000061 + attractorIndex) * 0.1;
  const rotation = rotationFor(yaw, pitch);
  const staticStride = Math.max(1, Math.floor(trace.points.length / 3_400));
  const lineWidth = clamp(Math.min(panel.width, panel.height) * 0.004, 0.35, 1.1);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#e7dfd2";
  context.globalAlpha = 0.075;
  context.lineWidth = lineWidth;
  drawSpan(
    context,
    trace.points,
    trace,
    panel,
    0,
    trace.points.length - 1,
    staticStride,
    rotation,
  );

  const segments = 3;
  for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
    const particle = particleTrails[particleIndex];
    if (!particle || particle.length === 0) continue;
    const tailLength = Math.min(MAX_TRAIL_POINTS, particle.length);
    const tailStart = Math.max(0, particle.length - tailLength);
    const colour = particleColour(particleIndex);

    for (let segment = 0; segment < segments; segment += 1) {
      const start = tailStart + Math.floor((tailLength * segment) / segments);
      const end = tailStart + Math.floor((tailLength * (segment + 1)) / segments);
      context.strokeStyle = colour;
      context.globalAlpha = 0.07 + segment * 0.13;
      context.lineWidth = lineWidth * (0.8 + segment * 0.12);
      drawSpan(
        context,
        particle,
        trace,
        panel,
        start,
        Math.max(0, end - start),
        1,
        rotation,
      );
    }

    const current = particle[particle.length - 1];
    if (!current) continue;
    const projected = projectPoint(current, trace, panel, rotation);
    context.fillStyle = colour;
    context.globalAlpha = 0.94;
    context.beginPath();
    context.arc(
      projected.x,
      projected.y,
      clamp(Math.min(panel.width, panel.height) * 0.012, 1.1, 3.1),
      0,
      TAU,
    );
    context.fill();
  }

  context.globalAlpha = 0.74;
  context.fillStyle = "#e7dfd2";
  context.font = `${clamp(Math.min(panel.width, panel.height) * 0.045, 12, 24)}px var(--font-geist-mono), monospace`;
  context.textBaseline = "top";
  context.fillText(trace.definition.label, panel.x + 5, panel.y + 5);
  context.restore();
}

function drawField(
  context: CanvasRenderingContext2D,
  traces: readonly AttractorTrace[],
  particleTrailsByAttractor: ReadonlyMap<
    AttractorId,
    readonly (readonly PhasePoint[])[]
  >,
  size: FieldSize,
  activeAttractor: AttractorId,
  particleCount: number,
  time: number,
  pointer: PointerOrbit,
) {
  context.clearRect(0, 0, size.width, size.height);
  const activeTrace = traces.find(
    (trace) => trace.definition.id === activeAttractor,
  );
  if (!activeTrace) return;
  const orbitOffset = pointer.active
    ? (pointer.x - 0.5) * 1.2 + (pointer.y - 0.5) * 0.45
    : 0;
  const activeIndex = Math.max(0, DISPLAY_ORDER.indexOf(activeAttractor));
  drawAttractor(
    context,
    activeTrace,
    particleTrailsByAttractor.get(activeAttractor) ?? [activeTrace.points],
    particleCount,
    panelFor(size.width, size.height),
    time,
    activeIndex,
    orbitOffset,
  );
}

export default function AttractorSequenceOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const repaintRef = useRef<(() => void) | null>(null);
  const activeAttractorRef = useRef<AttractorId>("finance");
  const particleCountRef = useRef(1);
  const pointerRef = useRef<PointerOrbit>({ x: 0.5, y: 0.5, active: false });
  const [activeAttractor, setActiveAttractor] = useState<AttractorId>("finance");
  const [particleCount, setParticleCount] = useState(1);

  useEffect(() => {
    activeAttractorRef.current = activeAttractor;
    repaintRef.current?.();
  }, [activeAttractor]);

  useEffect(() => {
    particleCountRef.current = particleCount;
    repaintRef.current?.();
  }, [particleCount]);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const traces = createAttractorTraces();
    const tracesByAttractor = new Map(
      traces.map((trace) => [trace.definition.id, trace]),
    );
    const particleStatesByAttractor = new Map<
      AttractorId,
      readonly AttractorParticleState[]
    >();
    const particleTrailsByAttractor = new Map<
      AttractorId,
      PhasePoint[][]
    >();
    const captureRemainderByAttractor = new Map<AttractorId, number>();
    const simulationRemainderByAttractor = new Map<AttractorId, number>();

    for (const trace of traces) {
      const particles = createAttractorParticleStates(trace);
      particleStatesByAttractor.set(trace.definition.id, particles);
      particleTrailsByAttractor.set(
        trace.definition.id,
        particles.map((particle) => [particle.state]),
      );
      captureRemainderByAttractor.set(trace.definition.id, 0);
      simulationRemainderByAttractor.set(trace.definition.id, 0);
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size: FieldSize = { width: 0, height: 0 };
    let frameId: number | null = null;
    let previousFrameTime: number | null = null;

    const advanceParticles = (elapsedSeconds: number) => {
      const id = activeAttractorRef.current;
      const trace = tracesByAttractor.get(id);
      const particles = particleStatesByAttractor.get(id);
      const trails = particleTrailsByAttractor.get(id);
      if (!trace || !particles || !trails) return;

      const simulatedSeconds = (simulationRemainderByAttractor.get(id) ?? 0) +
        Math.min(elapsedSeconds, 0.05) * SIMULATION_SECONDS_PER_SECOND;
      const desiredSteps = Math.floor(simulatedSeconds / trace.definition.step);
      const steps = Math.min(MAX_INTEGRATION_STEPS_PER_FRAME, desiredSteps);
      simulationRemainderByAttractor.set(
        id,
        simulatedSeconds - steps * trace.definition.step,
      );
      if (steps === 0) return;

      let nextParticles = particles;
      for (let step = 0; step < steps; step += 1) {
        nextParticles = stepAttractorParticleStates(trace.definition, nextParticles);
      }
      particleStatesByAttractor.set(id, nextParticles);

      const captureRemainder = (captureRemainderByAttractor.get(id) ?? 0) + steps;
      if (captureRemainder < TRAIL_CAPTURE_INTERVAL) {
        captureRemainderByAttractor.set(id, captureRemainder);
        return;
      }
      captureRemainderByAttractor.set(id, captureRemainder % TRAIL_CAPTURE_INTERVAL);
      for (let index = 0; index < nextParticles.length; index += 1) {
        const trail = trails[index];
        const particle = nextParticles[index];
        if (!trail || !particle) continue;
        if (trail.length >= MAX_TRAIL_POINTS) trail.shift();
        trail.push(particle.state);
      }
    };

    const paint = (time = performance.now()) => {
      if (size.width <= 0 || size.height <= 0) return;
      drawField(
        context,
        traces,
        particleTrailsByAttractor,
        size,
        activeAttractorRef.current,
        particleCountRef.current,
        reducedMotion.matches ? 0 : time,
        pointerRef.current,
      );
    };

    const animate = (time: number) => {
      const elapsedSeconds = previousFrameTime === null
        ? 0
        : (time - previousFrameTime) / 1_000;
      previousFrameTime = time;
      advanceParticles(elapsedSeconds);
      paint(time);
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const requestedPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelRatio = Math.min(
        requestedPixelRatio,
        Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, bounds.width * bounds.height)),
      );
      size = { width: bounds.width, height: bounds.height };
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      paint();
    };

    const handleMotionPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      previousFrameTime = null;
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    repaintRef.current = paint;
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    reducedMotion.addEventListener("change", handleMotionPreference);
    resize();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      repaintRef.current = null;
    };
  }, []);

  const selectAttractor = (id: AttractorId) => {
    setActiveAttractor(id);
  };

  const selectAdjacentAttractor = (direction: -1 | 1) => {
    const currentIndex = DISPLAY_ORDER.indexOf(activeAttractor);
    const nextIndex = (currentIndex + direction + DISPLAY_ORDER.length) %
      DISPLAY_ORDER.length;
    const next = DISPLAY_ORDER[nextIndex];
    if (next) selectAttractor(next);
  };

  const activeLabel = ATTRACTOR_DEFINITIONS.find(
    (definition) => definition.id === activeAttractor,
  )?.label ?? activeAttractor;

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label={`${activeLabel} numerical strange-attractor trajectory in phase space.`}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1),
            y: clamp((event.clientY - bounds.top) / Math.max(1, bounds.height), 0, 1),
            active: true,
          };
          repaintRef.current?.();
        }}
        onPointerLeave={() => {
          pointerRef.current = { ...pointerRef.current, active: false };
          repaintRef.current?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            selectAdjacentAttractor(-1);
            return;
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            selectAdjacentAttractor(1);
            return;
          }
          const index = Number(event.key) - 1;
          const id = DISPLAY_ORDER[index];
          if (!id) return;
          event.preventDefault();
          selectAttractor(id);
        }}
      />
      <nav className={styles.navigation} aria-label="Attractor navigation">
        <button
          className={styles.stepButton}
          type="button"
          aria-label="Previous attractor"
          onClick={() => selectAdjacentAttractor(-1)}
        >
          previous
        </button>
        <div className={styles.navigationCenter}>
          <output className={styles.currentModel}>{activeLabel}</output>
          <div className={styles.modelList}>
            {ATTRACTOR_DEFINITIONS.map((definition) => (
              <button
                key={definition.id}
                type="button"
                aria-current={activeAttractor === definition.id ? "true" : undefined}
                onClick={() => selectAttractor(definition.id)}
              >
                {definition.label}
              </button>
            ))}
          </div>
          <label className={styles.particleControl} htmlFor="attractor-particle-count">
            <span>particles</span>
            <input
              id="attractor-particle-count"
              type="range"
              min="1"
              max={MAX_PARTICLE_COUNT}
              step="1"
              value={particleCount}
              onChange={(event) => setParticleCount(Number(event.currentTarget.value))}
            />
            <output>{particleCount}</output>
          </label>
        </div>
        <button
          className={styles.stepButton}
          type="button"
          aria-label="Next attractor"
          onClick={() => selectAdjacentAttractor(1)}
        >
          next
        </button>
      </nav>
    </main>
  );
}
