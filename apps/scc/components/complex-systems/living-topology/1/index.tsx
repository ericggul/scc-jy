"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./living-topology.module.css";
import {
  advanceLivingGraph,
  applyPrimitive,
  createLivingGraph,
  resizeGraph,
  type GraphEvent,
  type LivingGraph,
  type Point,
  type Primitive,
} from "./model";

const PRIMITIVES: Array<{ primitive: Primitive; notation: string; label: string }> = [
  { primitive: "birth", notation: "+V", label: "bud node" },
  { primitive: "death", notation: "−V", label: "shed node" },
  { primitive: "connect", notation: "+E", label: "form relation" },
  { primitive: "sever", notation: "−E", label: "sever relation" },
];

const AUTOMATIC_SEQUENCE: Primitive[] = ["birth", "connect", "sever", "death"];

type VisibleEvent = GraphEvent & { createdAt: number };

function drawGraph(
  context: CanvasRenderingContext2D,
  graph: LivingGraph,
  visibleEvents: VisibleEvent[],
  now: number,
) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  context.lineCap = "round";

  for (const edge of graph.edges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.strokeStyle = `rgba(23, 32, 28, ${0.18 + edge.strength * 0.54})`;
    context.lineWidth = 0.55 + edge.strength * 1.4;
    context.stroke();

    const travel = (graph.time * (0.16 + edge.activity * 0.12) + edge.id * 0.17) % 1;
    const pulseX = source.x + (target.x - source.x) * travel;
    const pulseY = source.y + (target.y - source.y) * travel;
    context.beginPath();
    context.arc(pulseX, pulseY, 1.4 + edge.activity * 1.2, 0, Math.PI * 2);
    context.fillStyle = `rgba(70, 105, 111, ${0.38 + edge.activity * 0.5})`;
    context.fill();
  }

  for (const node of graph.nodes) {
    const radius = 4.8 + node.energy * 5.3;
    const opening = 0.48 + (1 - node.energy) * 0.62;
    const rotation = graph.time * (0.08 + node.energy * 0.1) + node.id;
    context.beginPath();
    context.arc(node.x, node.y, radius, rotation + opening, rotation + Math.PI * 2);
    context.strokeStyle = "rgba(23, 32, 28, 0.92)";
    context.lineWidth = 1.25;
    context.stroke();
    context.beginPath();
    context.arc(node.x, node.y, Math.max(1.1, node.energy * 2.4), 0, Math.PI * 2);
    context.fillStyle = "rgba(23, 32, 28, 0.82)";
    context.fill();
  }

  for (const event of visibleEvents) {
    const progress = Math.min(1, (now - event.createdAt) / 1700);
    const alpha = 1 - progress;
    if (event.points.length === 2) {
      const [source, target] = event.points;
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
      context.setLineDash(event.primitive === "sever" ? [4, 7] : []);
      context.strokeStyle = event.primitive === "sever"
        ? `rgba(145, 79, 59, ${alpha * 0.9})`
        : `rgba(70, 105, 111, ${alpha * 0.9})`;
      context.lineWidth = 1.6;
      context.stroke();
      context.setLineDash([]);
    }
    const point = event.points[event.points.length - 1];
    if (!point) continue;
    context.beginPath();
    context.arc(point.x, point.y, 10 + progress * 28, 0, Math.PI * 2);
    context.strokeStyle = event.primitive === "death" || event.primitive === "sever"
      ? `rgba(145, 79, 59, ${alpha * 0.72})`
      : `rgba(70, 105, 111, ${alpha * 0.72})`;
    context.lineWidth = 1;
    context.stroke();
  }
}

export default function LivingTopologyOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const graphRef = useRef<LivingGraph | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const eventsRef = useRef<VisibleEvent[]>([]);
  const automaticIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [counts, setCounts] = useState({ nodes: 9, edges: 12 });
  const [latestEvent, setLatestEvent] = useState("activity circulates through the first relations");

  const operate = useCallback((primitive: Primitive, position?: Point) => {
    const graph = graphRef.current;
    if (!graph) return;
    const result = applyPrimitive(graph, primitive, position);
    graphRef.current = result.graph;
    setCounts({ nodes: result.graph.nodes.length, edges: result.graph.edges.length });
    if (result.event) {
      eventsRef.current = [
        ...eventsRef.current.slice(-4),
        { ...result.event, createdAt: performance.now() },
      ];
      setLatestEvent(result.event.message);
    }
  }, []);

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

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      graphRef.current = graphRef.current
        ? resizeGraph(graphRef.current, sizeRef.current, nextSize)
        : createLivingGraph(bounds.width, bounds.height);
      sizeRef.current = nextSize;
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;
      if (graphRef.current && !pausedRef.current && !reduceMotion.matches) {
        graphRef.current = advanceLivingGraph(
          graphRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
        );
      }
      eventsRef.current = eventsRef.current.filter(
        (event) => time - event.createdAt < 1800,
      );
      if (graphRef.current) drawGraph(context, graphRef.current, eventsRef.current, time);
      frameRef.current = requestAnimationFrame(render);
    };

    sizeCanvas();
    const resizeObserver = new ResizeObserver(sizeCanvas);
    resizeObserver.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    const automaticTimer = window.setInterval(() => {
      if (pausedRef.current || reduceMotion.matches) return;
      const primitive = AUTOMATIC_SEQUENCE[automaticIndexRef.current % AUTOMATIC_SEQUENCE.length];
      automaticIndexRef.current += 1;
      operate(primitive);
    }, 1550);

    return () => {
      resizeObserver.disconnect();
      window.clearInterval(automaticTimer);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [operate]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A living graph whose nodes and relations form, carry activity, and disappear. Press to bud a node at that position."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          operate("birth", {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          operate("birth", {
            x: event.currentTarget.clientWidth / 2,
            y: event.currentTarget.clientHeight / 2,
          });
        }}
      />

      <header className={styles.header}>
        <h1>living topology</h1>
        <p aria-label="Graph at time t">G<sub>t</sub> = (V<sub>t</sub>, E<sub>t</sub>)</p>
      </header>

      <section className={styles.state} aria-label="Current graph state">
        <dl>
          <div><dt>nodes</dt><dd>{counts.nodes}</dd></div>
          <div><dt>relations</dt><dd>{counts.edges}</dd></div>
        </dl>
        <output aria-live="polite">{latestEvent}</output>
      </section>

      <div className={styles.controls} aria-label="Topology operations">
        {PRIMITIVES.map(({ primitive, notation, label }) => (
          <button key={primitive} type="button" onClick={() => operate(primitive)}>
            <strong>{notation}</strong>
            <span>{label}</span>
          </button>
        ))}
        <button
          className={styles.pause}
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "continue" : "pause"}
        </button>
      </div>
    </main>
  );
}
