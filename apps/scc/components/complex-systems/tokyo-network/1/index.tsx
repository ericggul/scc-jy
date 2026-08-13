"use client";

import { useEffect, useRef, useState } from "react";
import { getTokyoRoadPaths } from "./map-data";
import {
  createTokyoNetwork,
  DEFAULT_TOKYO_NETWORK_PARAMETERS,
  introduceTokyoNode,
  stepTokyoNetwork,
  type MapPoint,
  type TokyoNetwork,
  type TokyoNetworkParameters,
} from "./model";
import styles from "./tokyo-network.module.css";

type MapFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ROAD_PATHS = getTokyoRoadPaths();
const ROAD_POINTS = ROAD_PATHS.flat();
const MAP_ASPECT = 1.205;
const SIMULATION_STEP = 0.32;

type VisualParameters = TokyoNetworkParameters & { tempo: number };
type AdjustableParameter = keyof VisualParameters;

const DEFAULT_PARAMETERS: VisualParameters = {
  ...DEFAULT_TOKYO_NETWORK_PARAMETERS,
  tempo: 7.5,
};

const PARAMETER_CONTROLS: Array<{
  name: AdjustableParameter;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}> = [
  {
    name: "tempo",
    label: "tempo",
    min: 1,
    max: 16,
    step: 0.1,
    format: (value) => `${value.toFixed(1)}×`,
  },
  {
    name: "arrivalRate",
    label: "arrival",
    min: 0.2,
    max: 4,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    name: "edgeDensity",
    label: "density",
    min: 0.6,
    max: 3,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    name: "minimumDistance",
    label: "reach",
    min: 0.05,
    max: 0.42,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    name: "edgePersistence",
    label: "edge life",
    min: 0.25,
    max: 2.4,
    step: 0.05,
    format: (value) => value.toFixed(2),
  },
  {
    name: "nodePersistence",
    label: "node life",
    min: 0.35,
    max: 3,
    step: 0.05,
    format: (value) => value.toFixed(2),
  },
];

function getMapFrame(width: number, height: number): MapFrame {
  const maximumWidth = width * 0.92;
  const maximumHeight = height * 0.84;
  const widthFromHeight = maximumHeight * MAP_ASPECT;
  const frameWidth = Math.min(maximumWidth, widthFromHeight);
  const frameHeight = frameWidth / MAP_ASPECT;

  return {
    x: (width - frameWidth) / 2,
    y: (height - frameHeight) / 2,
    width: frameWidth,
    height: frameHeight,
  };
}

function project(point: MapPoint, frame: MapFrame) {
  return {
    x: frame.x + point.x * frame.width,
    y: frame.y + point.y * frame.height,
  };
}

function getVisibility(time: number, bornAt: number, expiresAt: number) {
  return Math.min(1, (time - bornAt) / 0.45, (expiresAt - time) / 0.45);
}

function nearestRoadPoint(point: MapPoint) {
  let nearest = ROAD_POINTS[0] ?? point;
  let nearestDistance = Infinity;

  for (const candidate of ROAD_POINTS) {
    const candidateDistance = Math.hypot(
      candidate.x - point.x,
      candidate.y - point.y,
    );
    if (candidateDistance >= nearestDistance) continue;
    nearest = candidate;
    nearestDistance = candidateDistance;
  }

  return nearest;
}

function drawRoads(
  context: CanvasRenderingContext2D,
  frame: MapFrame,
) {
  context.fillStyle = "#dce2dc";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  context.beginPath();

  for (const road of ROAD_PATHS) {
    const start = road[0];
    if (!start) continue;
    const first = project(start, frame);
    context.moveTo(first.x, first.y);

    for (let index = 1; index < road.length; index += 1) {
      const point = road[index];
      if (!point) continue;
      const position = project(point, frame);
      context.lineTo(position.x, position.y);
    }
  }

  context.strokeStyle = "rgba(23, 32, 28, 0.18)";
  context.lineWidth = 0.5;
  context.stroke();
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  network: TokyoNetwork,
  frame: MapFrame,
) {
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  const degree = new Map<number, number>();

  for (const edge of network.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const visibility = getVisibility(network.time, edge.bornAt, edge.expiresAt);
    if (visibility <= 0) continue;
    const sourcePosition = project(source.point, frame);
    const targetPosition = project(target.point, frame);
    context.beginPath();
    context.moveTo(sourcePosition.x, sourcePosition.y);
    context.lineTo(targetPosition.x, targetPosition.y);
    context.strokeStyle = `rgba(70, 105, 111, ${visibility * (0.16 + edge.strength * 0.34)})`;
    context.lineWidth = 0.55 + edge.strength * 0.7;
    context.stroke();

    const travel =
      (network.time * (0.68 + edge.strength * 1.6) + edge.id * 0.173) % 1;
    const pulseX = sourcePosition.x + (targetPosition.x - sourcePosition.x) * travel;
    const pulseY = sourcePosition.y + (targetPosition.y - sourcePosition.y) * travel;
    context.beginPath();
    context.arc(pulseX, pulseY, 0.9 + edge.strength * 0.85, 0, Math.PI * 2);
    context.fillStyle = `rgba(70, 105, 111, ${visibility * (0.34 + edge.strength * 0.36)})`;
    context.fill();
  }

  for (const node of network.nodes) {
    const visibility = getVisibility(network.time, node.bornAt, node.expiresAt);
    if (visibility <= 0) continue;
    const position = project(node.point, frame);
    const radius = 1.7 + Math.min(4, degree.get(node.id) ?? 0) * 0.58;
    context.beginPath();
    context.arc(position.x, position.y, radius * visibility, 0, Math.PI * 2);
    context.fillStyle = `rgba(23, 32, 28, ${0.42 + visibility * 0.4})`;
    context.fill();

    if (node.introduced && network.time - node.bornAt < 1.35) {
      const ring = radius + (network.time - node.bornAt) * 14;
      context.beginPath();
      context.arc(position.x, position.y, ring, 0, Math.PI * 2);
      context.strokeStyle = `rgba(70, 105, 111, ${(1.35 - (network.time - node.bornAt)) * 0.42})`;
      context.lineWidth = 0.8;
      context.stroke();
    }
  }
}

export default function TokyoNetworkOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<TokyoNetwork | null>(null);
  const pendingPointRef = useRef<MapPoint | null>(null);
  const frameRef = useRef<MapFrame | null>(null);
  const pausedRef = useRef(false);
  const parametersRef = useRef<VisualParameters>(DEFAULT_PARAMETERS);
  const [paused, setPaused] = useState(false);
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  useEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const renderer = surface.getContext("2d");
    if (!renderer) return;

    const mapLayer = document.createElement("canvas");
    const mapRenderer = mapLayer.getContext("2d");
    if (!mapRenderer) return;
    const canvasElement = surface as HTMLCanvasElement;
    const renderContext = renderer as CanvasRenderingContext2D;
    const mapContext = mapRenderer as CanvasRenderingContext2D;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let size = { width: 0, height: 0, ratio: 1 };
    let previousTime = performance.now();
    let simulationRemainder = 0;
    let frameId: number | null = null;

    function resize() {
      const bounds = canvasElement.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      size = { width: bounds.width, height: bounds.height, ratio };
      canvasElement.width = Math.round(bounds.width * ratio);
      canvasElement.height = Math.round(bounds.height * ratio);
      mapLayer.width = Math.round(bounds.width * ratio);
      mapLayer.height = Math.round(bounds.height * ratio);
      renderContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      mapContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      const frame = getMapFrame(bounds.width, bounds.height);
      frameRef.current = frame;
      drawRoads(mapContext, frame);

      if (!networkRef.current) {
        networkRef.current = createTokyoNetwork(
          ROAD_POINTS,
          undefined,
          parametersRef.current,
        );
      }
    }

    function render(now: number) {
      const delta = Math.min((now - previousTime) / 1000, 0.045);
      previousTime = now;
      const network = networkRef.current;

      if (network && !pausedRef.current && !reduceMotion.matches) {
        simulationRemainder += delta * parametersRef.current.tempo;
        while (simulationRemainder >= SIMULATION_STEP) {
          const activeNetwork = networkRef.current;
          if (!activeNetwork) break;
          networkRef.current = stepTokyoNetwork(
            activeNetwork,
            ROAD_POINTS,
            SIMULATION_STEP,
            parametersRef.current,
          );
          simulationRemainder -= SIMULATION_STEP;
        }
      }

      if (networkRef.current && pendingPointRef.current) {
        networkRef.current = introduceTokyoNode(
          networkRef.current,
          pendingPointRef.current,
          parametersRef.current,
        );
        pendingPointRef.current = null;
      }

      const frame = frameRef.current;
      if (networkRef.current && frame) {
        renderContext.clearRect(0, 0, size.width, size.height);
        renderContext.drawImage(
          mapLayer,
          0,
          0,
          mapLayer.width,
          mapLayer.height,
          0,
          0,
          size.width,
          size.height,
        );
        drawNetwork(renderContext, networkRef.current, frame);
      }

      frameId = requestAnimationFrame(render);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvasElement);
    frameId = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  function introducePoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = {
      x: (event.clientX - bounds.left - frame.x) / frame.width,
      y: (event.clientY - bounds.top - frame.y) / frame.height,
    };
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return;
    pendingPointRef.current = nearestRoadPoint(point);
  }

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A central Tokyo road map overlaid with an adaptive network. Nodes and long-range edges form, strengthen, and disappear. Press on the map to introduce a new node on the nearest road."
        tabIndex={0}
        onPointerDown={introducePoint}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          pendingPointRef.current = nearestRoadPoint({ x: 0.5, y: 0.5 });
        }}
      />

      <header className={styles.header}>
        <h1>tokyo network</h1>
        <p>roads hold / relations change</p>
      </header>

      <section className={styles.parameters} aria-label="Tokyo network parameters">
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
                const value = event.currentTarget.valueAsNumber;
                setParameters((current) => ({
                  ...current,
                  [control.name]: value,
                }));
              }}
            />
            <output>{control.format(parameters[control.name])}</output>
          </label>
        ))}
      </section>

      <footer className={styles.footer}>
        <p>press the map to introduce a point</p>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "continue" : "pause"}
        </button>
      </footer>
    </main>
  );
}
