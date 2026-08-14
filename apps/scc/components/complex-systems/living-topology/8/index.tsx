"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./filament-growth.module.css";
import {
  createFilamentTopology,
  DEFAULT_FILAMENT_PARAMETERS,
  introduceNutrient,
  measureFilamentTopology,
  resizeFilamentTopology,
  stepFilamentTopology,
  type FilamentEvents,
  type FilamentParameters,
  type FilamentTopology,
} from "./model";

const EMPTY_EVENTS: FilamentEvents = {
  extensions: 0,
  branches: 0,
  fusions: 0,
  lostTips: 0,
  pruned: 0,
};

type Readout = ReturnType<typeof measureFilamentTopology> & {
  nutrients: number;
  events: FilamentEvents;
};

function makeReadout(topology: FilamentTopology, events: FilamentEvents): Readout {
  return { ...measureFilamentTopology(topology), nutrients: topology.nutrients.length, events };
}

function drawTopology(context: CanvasRenderingContext2D, topology: FilamentTopology) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  const nodes = new Map(topology.nodes.map((node) => [node.id, node]));
  context.lineCap = "round";
  for (const filament of topology.filaments) {
    const source = nodes.get(filament.source);
    const target = nodes.get(filament.target);
    if (!source || !target) continue;
    const freshness = Math.max(0, 1 - (topology.time - filament.bornAt) / 1.4);
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.lineWidth = 0.75 + freshness * 0.85;
    context.strokeStyle = `rgba(44, 58, 46, ${0.34 + freshness * 0.34})`;
    context.stroke();
  }
  for (const nutrient of topology.nutrients) {
    const pulse = 1 + Math.sin(topology.time * 4 + nutrient.id) * 0.12;
    context.beginPath();
    context.arc(nutrient.x, nutrient.y, (5 + nutrient.strength * 6) * pulse, 0, Math.PI * 2);
    context.fillStyle = `rgba(73, 119, 105, ${0.18 + nutrient.strength * 0.24})`;
    context.fill();
    context.beginPath();
    context.arc(nutrient.x, nutrient.y, 2.1, 0, Math.PI * 2);
    context.fillStyle = "rgba(48, 97, 83, 0.8)";
    context.fill();
  }
  for (const node of topology.nodes) {
    if (node.role === "junction") {
      context.beginPath();
      context.arc(node.x, node.y, 1.25, 0, Math.PI * 2);
      context.fillStyle = "rgba(40, 52, 43, 0.66)";
      context.fill();
    }
    if (node.role === "root") {
      context.save();
      context.translate(node.x, node.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = "rgba(133, 71, 45, 0.94)";
      context.fillRect(-4.2, -4.2, 8.4, 8.4);
      context.restore();
    }
  }
  const tipsByNode = new Map<number, number>();
  for (const tip of topology.tips) {
    tipsByNode.set(tip.nodeId, (tipsByNode.get(tip.nodeId) ?? 0) + 1);
  }
  for (const [nodeId, count] of tipsByNode) {
    const node = nodes.get(nodeId);
    if (!node) continue;
    context.beginPath();
    context.arc(node.x, node.y, 2.25 + Math.min(2, count - 1) * 0.65, 0, Math.PI * 2);
    context.fillStyle = "rgba(181, 87, 45, 0.95)";
    context.fill();
  }
}

export default function FilamentGrowthEight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const topologyRef = useRef<FilamentTopology | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const parametersRef = useRef<FilamentParameters>(DEFAULT_FILAMENT_PARAMETERS);
  const eventsRef = useRef<FilamentEvents>({ ...EMPTY_EVENTS });
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [parameters, setParameters] = useState(DEFAULT_FILAMENT_PARAMETERS);
  const [readout, setReadout] = useState<Readout>(() => {
    const topology = createFilamentTopology(1_200, 760);
    return makeReadout(topology, EMPTY_EVENTS);
  });

  const refreshReadout = useCallback(() => {
    const topology = topologyRef.current;
    if (!topology) return;
    setReadout(makeReadout(topology, eventsRef.current));
    eventsRef.current = { ...EMPTY_EVENTS };
  }, []);

  const reset = useCallback(() => {
    const size = sizeRef.current;
    if (size.width <= 0 || size.height <= 0) return;
    const topology = createFilamentTopology(size.width, size.height);
    topologyRef.current = topology;
    eventsRef.current = { ...EMPTY_EVENTS };
    setReadout(makeReadout(topology, EMPTY_EVENTS));
  }, []);

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
    let previousReadout = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      topologyRef.current = topologyRef.current
        ? resizeFilamentTopology(topologyRef.current, sizeRef.current, nextSize)
        : createFilamentTopology(bounds.width, bounds.height);
      sizeRef.current = nextSize;
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1_000, 0.05);
      previousTime = time;
      if (topologyRef.current && !pausedRef.current && !reduceMotion.matches) {
        const result = stepFilamentTopology(topologyRef.current, delta, parametersRef.current);
        topologyRef.current = result.topology;
        const previous = eventsRef.current;
        eventsRef.current = {
          extensions: previous.extensions + result.events.extensions,
          branches: previous.branches + result.events.branches,
          fusions: previous.fusions + result.events.fusions,
          lostTips: previous.lostTips + result.events.lostTips,
          pruned: previous.pruned + result.events.pruned,
        };
      }
      if (topologyRef.current) {
        drawTopology(context, topologyRef.current);
        if (time - previousReadout >= 360) {
          refreshReadout();
          previousReadout = time;
        }
      }
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvas();
    const observer = new ResizeObserver(sizeCanvas);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [refreshReadout]);

  const addNutrient = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const topology = topologyRef.current;
    if (!canvas || !topology) return;
    const bounds = canvas.getBoundingClientRect();
    topologyRef.current = introduceNutrient(topology, {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    });
    refreshReadout();
  }, [refreshReadout]);

  const setParameter = (name: keyof FilamentParameters, value: number) => {
    setParameters((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Growing filament topology. Press the field to introduce a temporary nutrient source. Active tips extend the graph, branch, fuse on contact, die, and leave terminal material that can be pruned."
        role="application"
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          addNutrient(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) === 0) return;
          addNutrient(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          addNutrient(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }}
      />

      <header className={styles.header}>
        <h1>filament topology</h1>
        <p>tips extend; branches split; contact fuses; unused terminals retract</p>
      </header>

      <section className={styles.readout} aria-label="Filament topology measures">
        <dl>
          <div><dt>tips</dt><dd>{readout.tips}</dd></div>
          <div><dt>vertices / filaments</dt><dd>{readout.vertices}/{readout.filaments}</dd></div>
          <div><dt>loops</dt><dd>{readout.loops}</dd></div>
          <div><dt>reach</dt><dd>{readout.reach.toFixed(0)}</dd></div>
          <div><dt>branch / fuse / prune</dt><dd>{readout.events.branches}/{readout.events.fusions}/{readout.events.pruned}</dd></div>
        </dl>
      </section>

      <section className={styles.controls} aria-label="Filament topology controls">
        {(
          [
            ["branching", "branching"],
            ["fusion", "fusion"],
            ["pruning", "pruning"],
          ] as const
        ).map(([name, label]) => (
          <label className={styles.range} key={name}>
            <span>{label} <output>{parameters[name].toFixed(2)}</output></span>
            <input
              max="1"
              min="0"
              step="0.01"
              type="range"
              value={parameters[name]}
              onChange={(event) => setParameter(name, Number(event.target.value))}
            />
          </label>
        ))}
        <div className={styles.actions}>
          <button aria-pressed={paused} type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={reset}>reseed</button>
        </div>
      </section>
    </main>
  );
}
