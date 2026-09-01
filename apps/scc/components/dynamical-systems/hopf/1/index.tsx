"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./hopf.module.css";
import {
  DEFAULT_HOPF_PARAMETERS,
  HOMOCLINIC_BIFURCATION,
  MAXIMUM_INTEGRATION_STEP,
  advanceHopf,
  saddleEquilibriumAt,
  type HopfState,
} from "./model";

type CanvasSize = Readonly<{
  width: number;
  height: number;
}>;

type Trajectory = {
  colour: string;
  history: HopfState[];
  state: HopfState;
};

type Simulation = {
  captureRemainder: number;
  trajectories: Trajectory[];
};

type PhaseViewport = Readonly<{
  center: HopfState;
  extent: number;
}>;

const TAU = Math.PI * 2;
const TRAJECTORY_COLOURS = ["#355f68", "#ae4e3d", "#806673"] as const;
const TRAJECTORY_COUNT = 15;
const TRAIL_POINT_LIMIT = 210;
const TRAIL_CAPTURE_INTERVAL = 0.035;
const MODEL_SECONDS_PER_SECOND = 2.25;
const MAX_CANVAS_PIXELS = 6_000_000;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function phaseViewportFor(): PhaseViewport {
  return {
    center: { x: 0.28, y: 0.08 },
    extent: 1.24,
  };
}

function pointForState(state: HopfState, size: CanvasSize, viewport: PhaseViewport) {
  const scale = Math.min(size.width, size.height) * 0.445 / viewport.extent;
  return {
    x: size.width / 2 + (state.x - viewport.center.x) * scale,
    y: size.height / 2 - (state.y - viewport.center.y) * scale,
  };
}

function stateForPoint(
  point: { x: number; y: number },
  size: CanvasSize,
  viewport: PhaseViewport,
): HopfState {
  const scale = Math.min(size.width, size.height) * 0.445 / viewport.extent;
  return {
    x: viewport.center.x + (point.x - size.width / 2) / scale,
    y: viewport.center.y + (size.height / 2 - point.y) / scale,
  };
}

function initialStateFor(index: number): HopfState {
  const phase = index * 2.399963229728653;
  const radius = 0.012 + ((index * 7) % 11) * 0.006;
  return {
    x: radius * Math.cos(phase),
    y: radius * Math.sin(phase),
  };
}

function createSimulation(releasedState?: HopfState): Simulation {
  return {
    captureRemainder: 0,
    trajectories: Array.from({ length: TRAJECTORY_COUNT }, (_, index) => {
      const state = index === 0 && releasedState ? releasedState : initialStateFor(index);
      return {
        colour: TRAJECTORY_COLOURS[index % TRAJECTORY_COLOURS.length]!,
        history: [state],
        state,
      };
    }),
  };
}

function appendToHistory(trajectory: Trajectory) {
  trajectory.history.push(trajectory.state);
  if (trajectory.history.length > TRAIL_POINT_LIMIT) trajectory.history.shift();
}

function advanceSimulation(
  simulation: Simulation,
  bifurcation: number,
  duration: number,
) {
  const parameters = { ...DEFAULT_HOPF_PARAMETERS, bifurcation };
  const boundedDuration = Math.min(duration, 0.06) * MODEL_SECONDS_PER_SECOND;
  if (boundedDuration <= 0) return;

  for (const trajectory of simulation.trajectories) {
    trajectory.state = advanceHopf(
      trajectory.state,
      parameters,
      boundedDuration,
      MAXIMUM_INTEGRATION_STEP,
    );
  }

  simulation.captureRemainder += boundedDuration;
  while (simulation.captureRemainder >= TRAIL_CAPTURE_INTERVAL) {
    simulation.captureRemainder -= TRAIL_CAPTURE_INTERVAL;
    for (const trajectory of simulation.trajectories) appendToHistory(trajectory);
  }
}

function drawTrail(
  context: CanvasRenderingContext2D,
  trajectory: Trajectory,
  size: CanvasSize,
  viewport: PhaseViewport,
) {
  const first = trajectory.history[0];
  if (!first) return;

  context.beginPath();
  let point = pointForState(first, size, viewport);
  context.moveTo(point.x, point.y);
  for (const state of trajectory.history.slice(1)) {
    point = pointForState(state, size, viewport);
    context.lineTo(point.x, point.y);
  }
  context.strokeStyle = trajectory.colour;
  context.globalAlpha = 0.34;
  context.lineWidth = Math.max(0.82, Math.min(1.45, Math.min(size.width, size.height) * 0.0024));
  context.stroke();

  const current = pointForState(trajectory.state, size, viewport);
  context.globalAlpha = 0.94;
  context.fillStyle = trajectory.colour;
  context.beginPath();
  context.arc(
    current.x,
    current.y,
    Math.max(2.1, Math.min(3.7, Math.min(size.width, size.height) * 0.006)),
    0,
    TAU,
  );
  context.fill();
}

function drawField(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  simulation: Simulation,
  bifurcation: number,
) {
  const parameters = { ...DEFAULT_HOPF_PARAMETERS, bifurcation };
  const viewport = phaseViewportFor();
  const origin = pointForState({ x: 0, y: 0 }, size, viewport);
  const saddle = pointForState(saddleEquilibriumAt(parameters), size, viewport);
  context.clearRect(0, 0, size.width, size.height);
  context.fillStyle = "#eef0e9";
  context.fillRect(0, 0, size.width, size.height);

  context.save();
  context.strokeStyle = "#7b8d87";
  context.globalAlpha = 0.48;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, origin.y);
  context.lineTo(size.width, origin.y);
  context.moveTo(origin.x, 0);
  context.lineTo(origin.x, size.height);
  context.stroke();

  context.globalAlpha = 0.72;
  context.fillStyle = "#1b2a2d";
  context.beginPath();
  context.arc(origin.x, origin.y, 2.1, 0, TAU);
  context.fill();

  context.globalAlpha = 0.64;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(saddle.x, saddle.y, 3.5, 0, TAU);
  context.stroke();

  context.lineCap = "round";
  context.lineJoin = "round";
  for (const trajectory of simulation.trajectories) {
    drawTrail(context, trajectory, size, viewport);
  }
  context.restore();
}

function formatBifurcation(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

export default function HopfOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bifurcationRef = useRef(DEFAULT_HOPF_PARAMETERS.bifurcation);
  const restartRef = useRef<((releasedState?: HopfState) => void) | null>(null);
  const [bifurcation, setBifurcation] = useState(DEFAULT_HOPF_PARAMETERS.bifurcation);
  const phaseDescription = Math.abs(bifurcation) < 0.00005
    ? "Hopf threshold at the origin"
    : Math.abs(bifurcation - HOMOCLINIC_BIFURCATION) < 0.00005
    ? "documented homoclinic threshold"
    : "quadratic Hopf example";

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size: CanvasSize = { width: 0, height: 0 };
    let simulation = createSimulation();
    let frameId: number | null = null;
    let previousFrameTime: number | null = null;

    const paint = () => {
      if (size.width <= 0 || size.height <= 0) return;
      drawField(context, size, simulation, bifurcationRef.current);
    };

    const restart = (releasedState?: HopfState) => {
      simulation = createSimulation(releasedState);
      if (reducedMotion.matches) {
        for (let sample = 0; sample < 180; sample += 1) {
          advanceSimulation(simulation, bifurcationRef.current, TRAIL_CAPTURE_INTERVAL);
        }
      }
      previousFrameTime = null;
      paint();
    };

    const animate = (time: number) => {
      const elapsed = previousFrameTime === null ? 0 : (time - previousFrameTime) / 1_000;
      previousFrameTime = time;
      advanceSimulation(simulation, bifurcationRef.current, elapsed);
      paint();
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
      restart();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    restartRef.current = restart;
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    reducedMotion.addEventListener("change", handleMotionPreference);
    resize();
    restart();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      restartRef.current = null;
    };
  }, []);

  useEffect(() => {
    bifurcationRef.current = bifurcation;
    restartRef.current?.();
  }, [bifurcation]);

  return (
    <main ref={fieldRef} className={styles.field} aria-label="Hopf phase plane">
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="Interactive Hopf phase plane. Click to release a trajectory. Arrow keys change the bifurcation parameter; R resets the field."
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const size = { width: bounds.width, height: bounds.height };
          const state = stateForPoint(
            { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
            size,
            phaseViewportFor(),
          );
          restartRef.current?.(state);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            setBifurcation((current) => Number(
              clamp(current - 0.001, -0.01, HOMOCLINIC_BIFURCATION).toFixed(8),
            ));
            return;
          }
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            setBifurcation((current) => Number(
              clamp(current + 0.001, -0.01, HOMOCLINIC_BIFURCATION).toFixed(8),
            ));
            return;
          }
          if (event.key.toLowerCase() === "r") {
            event.preventDefault();
            restartRef.current?.();
          }
        }}
      />
      <section className={styles.controls} aria-label="Hopf bifurcation control">
        <label className={styles.parameter} htmlFor="hopf-bifurcation">
          <span className={styles.symbol} aria-hidden="true">μ</span>
          <input
            id="hopf-bifurcation"
            className={styles.range}
            type="range"
            min="-0.01"
            max={HOMOCLINIC_BIFURCATION}
            step="0.00005"
            value={bifurcation}
            aria-label="Bifurcation parameter"
            aria-valuetext={`mu ${formatBifurcation(bifurcation)}; ${phaseDescription}`}
            onChange={(event) => setBifurcation(Number(event.currentTarget.value))}
          />
          <output className={styles.parameterValue}>μ {formatBifurcation(bifurcation)}</output>
        </label>
        <button
          className={styles.restart}
          type="button"
          onClick={() => restartRef.current?.()}
        >
          release
        </button>
      </section>
    </main>
  );
}
