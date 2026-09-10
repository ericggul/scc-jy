"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./barabasi-albert.module.css";
import {
  DEFAULT_ATTACHMENTS,
  createBarabasiAlbertGraph,
  growBarabasiAlbertGraph,
  growBarabasiAlbertGraphTo,
  type BarabasiAlbertGraph,
} from "./model";
import {
  relaxGraphLayout,
  synchronizeGraphLayout,
  type GraphLayout,
} from "./rendering/layout";

const MODEL_SEED = 0x18d73a61;
const INITIAL_VISIBLE_NODES = 5;
const ARRIVAL_INTERVAL = 560;
const ATTACHMENT_OPTIONS = [1, 2, 3, 4] as const;
const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

type SurfaceSize = {
  width: number;
  height: number;
};

type NetworkReadout = {
  vertices: number;
  edges: number;
  hubDegree: number;
};

function graphReadout(graph: BarabasiAlbertGraph): NetworkReadout {
  return {
    vertices: graph.nodes.length,
    edges: graph.edges.length,
    hubDegree: Math.max(...graph.degrees),
  };
}

function nodeColour(degree: number, maximumDegree: number, newest: boolean) {
  void degree;
  void maximumDegree;
  return newest ? "#1f5eb8" : "#4e75c1";
}

function drawGraph(
  context: CanvasRenderingContext2D,
  graph: BarabasiAlbertGraph,
  layout: GraphLayout,
  size: SurfaceSize,
) {
  const newestId = graph.nodes.at(-1)?.id;
  const maximumDegree = Math.max(...graph.degrees);
  const minimumDimension = Math.min(size.width, size.height);
  context.fillStyle = "#fbfcff";
  context.fillRect(0, 0, size.width, size.height);
  context.lineCap = "round";

  for (const edge of graph.edges) {
    const source = layout.get(edge.source);
    const target = layout.get(edge.target);
    if (!source || !target) continue;
    const isArrival = edge.target === newestId;
    context.beginPath();
    context.moveTo(source.x * size.width, source.y * size.height);
    context.lineTo(target.x * size.width, target.y * size.height);
    context.strokeStyle = isArrival
      ? "rgba(45, 88, 166, 0.6)"
      : "rgba(71, 111, 183, 0.25)";
    context.lineWidth = isArrival ? 0.82 : 0.42;
    context.stroke();
  }

  for (const node of graph.nodes) {
    const point = layout.get(node.id);
    if (!point) continue;
    const degree = graph.degrees[node.id] ?? 0;
    const isNewest = node.id === newestId;
    const radius = Math.min(
      minimumDimension * 0.018,
      0.9 + Math.sqrt(degree) * 0.72,
    );
    const x = point.x * size.width;
    const y = point.y * size.height;

    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = nodeColour(degree, maximumDegree, isNewest);
    context.fill();

    const arrivalsSinceBirth = graph.generation - node.bornAt;
    if (arrivalsSinceBirth < 3) {
      context.globalAlpha = 0.36 - arrivalsSinceBirth * 0.1;
      context.strokeStyle = "#1f5eb8";
      context.lineWidth = 0.55;
      context.beginPath();
      context.arc(x, y, radius + 11 - arrivalsSinceBirth * 2.8, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }
}

export default function BarabasiAlbertScreen() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attachmentRef = useRef(DEFAULT_ATTACHMENTS);
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const graphRef = useRef<BarabasiAlbertGraph | null>(null);
  const layoutRef = useRef<GraphLayout>(new Map());
  const stepRef = useRef<(() => void) | null>(null);
  const restartRef = useRef<((attachments: number) => void) | null>(null);
  const [attachments, setAttachments] = useState(DEFAULT_ATTACHMENTS);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState<NetworkReadout>({
    vertices: INITIAL_VISIBLE_NODES,
    edges: 0,
    hubDegree: 0,
  });

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!field || !canvas || !context) return;

    let size: SurfaceSize = { width: 0, height: 0 };
    let frameId: number | null = null;
    let previousFrame = performance.now();
    let pendingGrowth = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const paint = () => {
      const graph = graphRef.current;
      if (!graph || size.width <= 0 || size.height <= 0) return;
      drawGraph(context, graph, layoutRef.current, size);
    };

    const settle = (iterations: number) => {
      const graph = graphRef.current;
      if (!graph) return;
      relaxGraphLayout(
        graph,
        layoutRef.current,
        size.width / Math.max(size.height, 1),
        iterations,
      );
    };

    const publish = (graph: BarabasiAlbertGraph) => {
      setReadout(graphReadout(graph));
    };

    const restart = (nextAttachments: number) => {
      attachmentRef.current = nextAttachments;
      const seed = createBarabasiAlbertGraph({
        initialNodeCount: 5,
        attachments: nextAttachments,
        seed: MODEL_SEED,
      });
      graphRef.current = growBarabasiAlbertGraphTo(seed, INITIAL_VISIBLE_NODES);
      layoutRef.current = new Map();
      synchronizeGraphLayout(
        graphRef.current,
        layoutRef.current,
        size.width / Math.max(size.height, 1),
      );
      settle(reducedMotion.matches ? 36 : 10);
      pendingGrowth = 0;
      publish(graphRef.current);
      paint();
    };

    const step = () => {
      const graph = graphRef.current;
      if (!graph) return;
      graphRef.current = growBarabasiAlbertGraph(graph);
      synchronizeGraphLayout(
        graphRef.current,
        layoutRef.current,
        size.width / Math.max(size.height, 1),
      );
      if (reducedMotion.matches || pausedRef.current) settle(72);
      publish(graphRef.current);
      paint();
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      size = { width: bounds.width, height: bounds.height };
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (graphRef.current) {
        synchronizeGraphLayout(
          graphRef.current,
          layoutRef.current,
          size.width / Math.max(size.height, 1),
        );
      }
      paint();
    };

    const render = (now: number) => {
      const elapsed = Math.min(now - previousFrame, 48);
      previousFrame = now;
      if (!pausedRef.current && !reducedMotion.matches) {
        pendingGrowth += elapsed * speedRef.current;
        while (pendingGrowth >= ARRIVAL_INTERVAL) {
          step();
          pendingGrowth -= ARRIVAL_INTERVAL;
        }
        settle(2);
      }
      paint();
      frameId = requestAnimationFrame(render);
    };

    const updateMotionPreference = () => {
      if (reducedMotion.matches) {
        settle(72);
        paint();
      }
    };

    stepRef.current = step;
    restartRef.current = restart;
    const observer = new ResizeObserver(resize);
    observer.observe(field);
    reducedMotion.addEventListener("change", updateMotionPreference);
    resize();
    restart(attachmentRef.current);
    frameId = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", updateMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
      stepRef.current = null;
      restartRef.current = null;
    };
  }, []);

  function changeAttachments(nextAttachments: number) {
    attachmentRef.current = nextAttachments;
    setAttachments(nextAttachments);
    restartRef.current?.(nextAttachments);
  }

  function changeSpeed(nextSpeed: number) {
    speedRef.current = nextSpeed;
    setSpeed(nextSpeed);
  }

  function togglePause() {
    setPaused((current) => {
      const next = !current;
      pausedRef.current = next;
      return next;
    });
  }

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-describedby="barabasi-description"
        aria-label="An evolving Barabási–Albert graph. Each new blue vertex begins at the centre before spreading through the network."
      />
      <header className={styles.header}>
        <p>Barabási–Albert growth</p>
      </header>
      <p id="barabasi-description" className={styles.screenReaderOnly}>
        {readout.vertices} vertices and {readout.edges} edges. The largest degree is {readout.hubDegree}.
      </p>
      <section className={styles.controls} aria-label="Barabási–Albert graph controls">
        <dl>
          <div><dt>vertices</dt><dd>{readout.vertices}</dd></div>
          <div><dt>edges</dt><dd>{readout.edges}</dd></div>
          <div><dt>hub degree</dt><dd>{readout.hubDegree}</dd></div>
        </dl>
        <div className={styles.actions}>
          <span className={styles.parameterGroup} aria-label="Edges per arrival">
            <span className={styles.groupLabel}>m</span>
            {ATTACHMENT_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={attachments === value}
                onClick={() => changeAttachments(value)}
              >
                {value}
              </button>
            ))}
          </span>
          <span className={styles.parameterGroup} aria-label="Growth speed">
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
          <button
            type="button"
            onClick={() => stepRef.current?.()}
          >
            step
          </button>
          <button type="button" onClick={() => restartRef.current?.(attachments)}>
            restart
          </button>
        </div>
      </section>
    </main>
  );
}
