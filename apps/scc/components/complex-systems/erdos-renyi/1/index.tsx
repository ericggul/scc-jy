"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./erdos-renyi.module.css";
import {
  DEFAULT_NODE_COUNT,
  DEFAULT_PROBABILITY,
  createErdosRenyiGraph,
  erdosRenyiMetrics,
  type ErdosRenyiGraph,
  type ErdosRenyiMetrics,
} from "./model";
import {
  createErdosRenyiLayout,
  type ErdosRenyiLayout,
} from "./rendering/layout";

const NODE_OPTIONS = [96, 192, 384] as const;
const PROBABILITY_OPTIONS = [0.002, 0.006, 0.012, 0.024] as const;
const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
const INITIAL_SEED = 0x6d5474a1;
const REVEAL_DURATION = 1_650;

type SurfaceSize = { width: number; height: number };

function formatProbability(value: number) {
  return value.toFixed(3);
}

function drawGraph(
  context: CanvasRenderingContext2D,
  graph: ErdosRenyiGraph,
  metrics: ErdosRenyiMetrics,
  layout: ErdosRenyiLayout,
  size: SurfaceSize,
  revealProgress: number,
) {
  const degrees = Array(graph.nodes.length).fill(0);
  const visibleEdgeCount = Math.round(graph.edges.length * revealProgress);
  for (let edgeIndex = 0; edgeIndex < visibleEdgeCount; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!;
    degrees[edge.source] += 1;
    degrees[edge.target] += 1;
  }
  const largestSize = metrics.largestComponentSize;
  const componentSize = (id: number) =>
    metrics.componentSizes[metrics.componentByNode[id] ?? -1] ?? 0;
  const isGiant = (id: number) => largestSize > 1 && componentSize(id) === largestSize;

  context.fillStyle = "#f7f8fb";
  context.fillRect(0, 0, size.width, size.height);
  context.lineCap = "round";

  for (const edge of graph.edges) {
    const source = layout.get(edge.source);
    const target = layout.get(edge.target);
    if (!source || !target) continue;
    const withinLargest = isGiant(edge.source) && isGiant(edge.target);
    context.beginPath();
    context.moveTo(source.x * size.width, source.y * size.height);
    context.lineTo(target.x * size.width, target.y * size.height);
    context.strokeStyle = withinLargest
      ? "rgba(43, 84, 159, 0.24)"
      : "rgba(105, 127, 172, 0.16)";
    context.lineWidth = withinLargest ? 0.56 : 0.42;
    context.stroke();
  }

  for (const node of graph.nodes) {
    const point = layout.get(node.id);
    if (!point) continue;
    const degree = degrees[node.id] ?? 0;
    const isolated = degree === 0;
    const radius = isolated ? 1.5 : 0.9 + Math.sqrt(degree) * 0.5;
    context.beginPath();
    context.arc(point.x * size.width, point.y * size.height, radius, 0, Math.PI * 2);
    context.fillStyle = isolated
      ? "#bb765d"
      : isGiant(node.id)
        ? "#28529d"
        : "#8296bd";
    context.fill();
  }
}

export default function ErdosRenyiOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seedRef = useRef(INITIAL_SEED);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const revealProgressRef = useRef(0);
  const resumeRevealRef = useRef<(() => void) | null>(null);
  const graphRef = useRef<ErdosRenyiGraph>(
    createErdosRenyiGraph({
      nodeCount: DEFAULT_NODE_COUNT,
      probability: DEFAULT_PROBABILITY,
      seed: INITIAL_SEED,
    }),
  );
  const metricsRef = useRef(erdosRenyiMetrics(graphRef.current));
  const [nodeCount, setNodeCount] = useState(DEFAULT_NODE_COUNT);
  const [probability, setProbability] = useState(DEFAULT_PROBABILITY);
  const [metrics, setMetrics] = useState(metricsRef.current);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!field || !canvas || !context) return;

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const size = { width: bounds.width, height: bounds.height };
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const layout = createErdosRenyiLayout(
        graphRef.current,
        size.width / Math.max(size.height, 1),
      );
      drawGraph(
        context,
        graphRef.current,
        metricsRef.current,
        layout,
        size,
        revealProgressRef.current,
      );
    };

    let frameId: number | null = null;
    let previousFrame: number | null = null;
    const renderReveal = (now: number) => {
      frameId = null;
      const elapsed = previousFrame === null ? 0 : Math.min(now - previousFrame, 64);
      previousFrame = now;
      if (!pausedRef.current) {
        revealProgressRef.current = Math.min(
          1,
          revealProgressRef.current +
            (elapsed * speedRef.current) / REVEAL_DURATION,
        );
      }
      resize();
      if (!pausedRef.current && revealProgressRef.current < 1) {
        frameId = requestAnimationFrame(renderReveal);
      }
    };

    const resumeReveal = () => {
      if (frameId !== null || revealProgressRef.current >= 1) return;
      previousFrame = null;
      frameId = requestAnimationFrame(renderReveal);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(field);
    resumeRevealRef.current = resumeReveal;
    resize();
    resumeReveal();
    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (resumeRevealRef.current === resumeReveal) {
        resumeRevealRef.current = null;
      }
    };
  }, [revision]);

  function sample(nextNodeCount = nodeCount, nextProbability = probability) {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    const graph = createErdosRenyiGraph({
      nodeCount: nextNodeCount,
      probability: nextProbability,
      seed: seedRef.current,
    });
    graphRef.current = graph;
    metricsRef.current = erdosRenyiMetrics(graph);
    revealProgressRef.current = 0;
    setMetrics(metricsRef.current);
    setRevision((current) => current + 1);
  }

  function chooseNodeCount(nextNodeCount: number) {
    setNodeCount(nextNodeCount);
    sample(nextNodeCount, probability);
  }

  function chooseProbability(nextProbability: number) {
    setProbability(nextProbability);
    sample(nodeCount, nextProbability);
  }

  function changeSpeed(nextSpeed: number) {
    speedRef.current = nextSpeed;
    setSpeed(nextSpeed);
  }

  function togglePause() {
    setPaused((current) => {
      const next = !current;
      pausedRef.current = next;
      if (!next) resumeRevealRef.current?.();
      return next;
    });
  }

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-describedby="erdos-renyi-description"
        aria-label="A seeded Erdős–Rényi random graph. Deep blue vertices belong to its largest component and rust vertices are isolated."
      />
      <header className={styles.header}>
        <p>Erdős–Rényi G(n,p)</p>
      </header>
      <p id="erdos-renyi-description" className={styles.screenReaderOnly}>
        {metrics.nodeCount} vertices, {metrics.edgeCount} edges, {metrics.isolatedCount} isolated vertices,
        and a largest connected component of {metrics.largestComponentSize} vertices.
      </p>
      <section className={styles.controls} aria-label="Erdős–Rényi graph controls">
        <dl>
          <div><dt>vertices</dt><dd>{metrics.nodeCount}</dd></div>
          <div><dt>edges</dt><dd>{metrics.edgeCount}</dd></div>
          <div><dt>largest component</dt><dd>{metrics.largestComponentSize}</dd></div>
          <div><dt>isolated</dt><dd>{metrics.isolatedCount}</dd></div>
        </dl>
        <div className={styles.actions}>
          <span className={styles.parameterGroup} aria-label="Vertex count">
            <span className={styles.groupLabel}>n</span>
            {NODE_OPTIONS.map((value) => (
              <button key={value} type="button" aria-pressed={nodeCount === value} onClick={() => chooseNodeCount(value)}>
                {value}
              </button>
            ))}
          </span>
          <span className={styles.parameterGroup} aria-label="Independent edge probability">
            <span className={styles.groupLabel}>p</span>
            {PROBABILITY_OPTIONS.map((value) => (
              <button key={value} type="button" aria-pressed={probability === value} onClick={() => chooseProbability(value)}>
                {formatProbability(value)}
              </button>
            ))}
          </span>
          <span className={styles.parameterGroup} aria-label="Reveal speed">
            <span className={styles.groupLabel}>speed</span>
            {SPEED_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={speed === value}
                onClick={() => changeSpeed(value)}
              >
                {value}×
              </button>
            ))}
          </span>
          <button type="button" aria-pressed={paused} onClick={togglePause}>
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={() => sample()}>sample again</button>
        </div>
      </section>
    </main>
  );
}
