"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./living-topology.module.css";
import {
  createLocalNetwork,
  stepLocalNetwork,
  type LocalEventCounts,
  type LocalNetwork,
  type Point,
} from "./model";

type Stimulus = Point & { expiresAt: number };

const EMPTY_EVENTS: LocalEventCounts = {
  born: 0,
  died: 0,
  connected: 0,
  severed: 0,
};

function drawNetwork(
  context: CanvasRenderingContext2D,
  network: LocalNetwork,
  stimuli: readonly Stimulus[],
  now: number,
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
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
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
    context.beginPath();
    context.arc(
      source.x + (target.x - source.x) * travel,
      source.y + (target.y - source.y) * travel,
      0.8,
      0,
      Math.PI * 2,
    );
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

export default function LivingTopologyTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<LocalNetwork | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const stimuliRef = useRef<Stimulus[]>([]);
  const pausedRef = useRef(false);
  const accumulatedEventsRef = useRef<LocalEventCounts>({ ...EMPTY_EVENTS });
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState({
    nodes: 220,
    edges: 0,
    events: EMPTY_EVENTS,
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

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
        drawNetwork(context, networkRef.current, stimuliRef.current, time);
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
        aria-label="A dense living graph of locally moving nodes. Hold or press to supply a temporary local resource field."
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
        <p>local decisions / local motion</p>
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
    </main>
  );
}
