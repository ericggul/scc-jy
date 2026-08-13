"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./living-topology.module.css";
import {
  createLocalNetwork,
  DEFAULT_NETWORK_PARAMETERS,
  stepLocalNetwork,
  type LocalEventCounts,
  type LocalNetwork,
  type NetworkParameters,
  type Point,
} from "./model";

type Stimulus = Point & { expiresAt: number };

type CubicCurve = {
  start: Point;
  controlOne: Point;
  controlTwo: Point;
  end: Point;
};

const EMPTY_EVENTS: LocalEventCounts = {
  born: 0,
  died: 0,
  connected: 0,
  severed: 0,
};

type AdjustableParameter = keyof NetworkParameters | "curvature";

type VisualParameters = NetworkParameters & { curvature: number };

const DEFAULT_PARAMETERS: VisualParameters = {
  ...DEFAULT_NETWORK_PARAMETERS,
  curvature: 0.2,
};

const PARAMETER_CONTROLS: Array<{
  name: AdjustableParameter;
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { name: "reproduction", label: "reproduction", min: 0, max: 2, step: 0.01 },
  { name: "mortality", label: "mortality", min: 0.1, max: 2, step: 0.01 },
  { name: "connection", label: "connection", min: 0, max: 1.4, step: 0.01 },
  { name: "severance", label: "severance", min: 0.1, max: 2, step: 0.01 },
  { name: "distantShare", label: "distant share", min: 0, max: 1, step: 0.01 },
  { name: "motion", label: "motion", min: 0, max: 2, step: 0.01 },
  { name: "curvature", label: "curve bend", min: 0, max: 0.5, step: 0.01 },
];

function getCubicCurve(
  source: Point,
  target: Point,
  edgeId: number,
  curvature: number,
): CubicCurve {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const direction = Math.sin(edgeId * 91.7) >= 0 ? 1 : -1;
  const bow = Math.min(220, 4 + distance * curvature) * direction;
  return {
    start: source,
    controlOne: {
      x: source.x + dx / 3 + normalX * bow,
      y: source.y + dy / 3 + normalY * bow,
    },
    controlTwo: {
      x: source.x + (dx * 2) / 3 + normalX * bow,
      y: source.y + (dy * 2) / 3 + normalY * bow,
    },
    end: target,
  };
}

function pointOnCubicCurve(curve: CubicCurve, position: number): Point {
  const inverse = 1 - position;
  const inverseSquared = inverse * inverse;
  const positionSquared = position * position;
  return {
    x:
      inverseSquared * inverse * curve.start.x +
      3 * inverseSquared * position * curve.controlOne.x +
      3 * inverse * positionSquared * curve.controlTwo.x +
      positionSquared * position * curve.end.x,
    y:
      inverseSquared * inverse * curve.start.y +
      3 * inverseSquared * position * curve.controlOne.y +
      3 * inverse * positionSquared * curve.controlTwo.y +
      positionSquared * position * curve.end.y,
  };
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  network: LocalNetwork,
  stimuli: readonly Stimulus[],
  now: number,
  curvature: number,
) {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const degree = new Map<number, number>();
  for (const edge of network.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  context.lineCap = "round";

  context.beginPath();
  for (const edge of network.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const curve = getCubicCurve(source, target, edge.id, curvature);
    context.moveTo(curve.start.x, curve.start.y);
    context.bezierCurveTo(
      curve.controlOne.x,
      curve.controlOne.y,
      curve.controlTwo.x,
      curve.controlTwo.y,
      curve.end.x,
      curve.end.y,
    );
  }
  context.strokeStyle = "rgba(25, 33, 29, 0.2)";
  context.lineWidth = 0.55;
  context.stroke();

  for (const edge of network.edges) {
    if (edge.signal < 0.7) continue;
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const travel = (network.time * 2.4 + edge.id * 0.31) % 1;
    const pulse = pointOnCubicCurve(
      getCubicCurve(source, target, edge.id, curvature),
      travel,
    );
    context.beginPath();
    context.arc(pulse.x, pulse.y, 0.8, 0, Math.PI * 2);
    context.fillStyle = `rgba(66, 99, 105, ${edge.signal * 0.72})`;
    context.fill();
  }

  for (const node of network.nodes) {
    const connectedEdges = degree.get(node.id) ?? 0;
    const radius = Math.min(14, 2.2 + connectedEdges * 1.15);
    context.beginPath();
    context.arc(node.x, node.y, radius, 0, Math.PI * 2);
    context.strokeStyle = `rgba(23, 32, 28, ${0.42 + node.energy * 0.5})`;
    context.lineWidth = 0.8;
    context.stroke();
  }

  for (const stimulus of stimuli) {
    const remaining = Math.max(0, (stimulus.expiresAt - now) / 1900);
    context.beginPath();
    context.arc(stimulus.x, stimulus.y, 22 + (1 - remaining) * 70, 0, Math.PI * 2);
    context.strokeStyle = `rgba(70, 105, 111, ${remaining * 0.34})`;
    context.lineWidth = 1;
    context.stroke();
  }
}

export default function LivingTopologyThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<LocalNetwork | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const stimuliRef = useRef<Stimulus[]>([]);
  const pausedRef = useRef(false);
  const parametersRef = useRef<VisualParameters>(DEFAULT_PARAMETERS);
  const accumulatedEventsRef = useRef<LocalEventCounts>({ ...EMPTY_EVENTS });
  const [paused, setPaused] = useState(false);
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);
  const [readout, setReadout] = useState({
    nodes: 260,
    edges: 0,
    events: EMPTY_EVENTS,
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let readoutTime = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!networkRef.current) {
        networkRef.current = createLocalNetwork(bounds.width, bounds.height);
      }
      sizeRef.current = nextSize;
      setReadout((current) => ({
        ...current,
        nodes: networkRef.current?.nodes.length ?? 0,
        edges: networkRef.current?.edges.length ?? 0,
      }));
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.035);
      previousTime = time;
      stimuliRef.current = stimuliRef.current.filter(
        (stimulus) => stimulus.expiresAt > time,
      );
      if (networkRef.current && !pausedRef.current && !reduceMotion.matches) {
        const result = stepLocalNetwork(
          networkRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
          stimuliRef.current,
          parametersRef.current,
        );
        networkRef.current = result.network;
        const accumulated = accumulatedEventsRef.current;
        accumulatedEventsRef.current = {
          born: accumulated.born + result.events.born,
          died: accumulated.died + result.events.died,
          connected: accumulated.connected + result.events.connected,
          severed: accumulated.severed + result.events.severed,
        };
      }
      if (networkRef.current) {
        drawNetwork(
          context,
          networkRef.current,
          stimuliRef.current,
          time,
          parametersRef.current.curvature,
        );
        if (time - readoutTime > 320) {
          setReadout({
            nodes: networkRef.current.nodes.length,
            edges: networkRef.current.edges.length,
            events: accumulatedEventsRef.current,
          });
          accumulatedEventsRef.current = { ...EMPTY_EVENTS };
          readoutTime = time;
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvas();
    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      resizeObserver.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A dense living graph of locally moving nodes joined by local and long-range cubic curves. Hold or press to supply a temporary local resource field."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          stimuliRef.current = [
            ...stimuliRef.current.slice(-5),
            {
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
              expiresAt: performance.now() + 1900,
            },
          ];
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          stimuliRef.current = [
            ...stimuliRef.current.slice(-5),
            {
              x: event.currentTarget.clientWidth / 2,
              y: event.currentTarget.clientHeight / 2,
              expiresAt: performance.now() + 1900,
            },
          ];
        }}
      />

      <header className={styles.header}>
        <h1>living topology</h1>
        <p>local + long-range relations / cubic flow</p>
      </header>

      <section className={styles.readout} aria-label="Local network activity">
        <dl>
          <div><dt>V</dt><dd>{readout.nodes}</dd></div>
          <div><dt>E</dt><dd>{readout.edges}</dd></div>
          <div><dt>+V</dt><dd>{readout.events.born}</dd></div>
          <div><dt>−V</dt><dd>{readout.events.died}</dd></div>
          <div><dt>+E</dt><dd>{readout.events.connected}</dd></div>
          <div><dt>−E</dt><dd>{readout.events.severed}</dd></div>
        </dl>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "continue" : "pause"}
        </button>
      </section>

      <details className={styles.parameters}>
        <summary>parameters</summary>
        <div className={styles.parameterBody}>
          {PARAMETER_CONTROLS.map((control) => (
            <label key={control.name} className={styles.parameter}>
              <span>{control.label}</span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={parameters[control.name]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setParameters((current) => ({
                    ...current,
                    [control.name]: value,
                  }));
                }}
              />
              <output>{parameters[control.name].toFixed(2)}</output>
            </label>
          ))}
          <button
            type="button"
            onClick={() => setParameters(DEFAULT_PARAMETERS)}
          >
            reset
          </button>
        </div>
      </details>
    </main>
  );
}
