"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./diffusion-graph.module.css";
import {
  createDiffusionSimulation,
  DEFAULT_DIFFUSION_RATE,
  DEFAULT_GRID_SIZE,
  DEFAULT_LINK_CHANCE,
  diffusionMetrics,
  nodeDiameter,
  rewireOneLink,
  stepDiffusion,
  type DiffusionMetrics,
} from "./model";

const INITIAL_SEED = 0x248f6a93;

function flowColour(flow: number, meanFlow: number) {
  // NetLogo scales gray over -0.4…1 using current-flow / (2 * mean-flow).
  const normalized = Math.max(0, Math.min(1, (flow / (2 * meanFlow + 0.00001) + 0.4) / 1.4));
  const brightness = Math.round(48 + normalized * 194);
  return `rgb(${brightness}, ${brightness + 2}, ${brightness + 7})`;
}

function drawArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  colour: string,
  targetRadius: number,
) {
  const distance = Math.max(0.0001, Math.hypot(toX - fromX, toY - fromY));
  const unitX = (toX - fromX) / distance;
  const unitY = (toY - fromY) / distance;
  const lineEndX = toX - unitX * (targetRadius + 4);
  const lineEndY = toY - unitY * (targetRadius + 4);
  const arrowSize = Math.min(9, Math.max(4.5, targetRadius * 0.72));

  context.strokeStyle = colour;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(lineEndX, lineEndY);
  context.stroke();

  context.fillStyle = colour;
  context.beginPath();
  context.moveTo(lineEndX, lineEndY);
  context.lineTo(
    lineEndX - unitX * arrowSize - unitY * arrowSize * 0.58,
    lineEndY - unitY * arrowSize + unitX * arrowSize * 0.58,
  );
  context.lineTo(
    lineEndX - unitX * arrowSize + unitY * arrowSize * 0.58,
    lineEndY - unitY * arrowSize - unitX * arrowSize * 0.58,
  );
  context.closePath();
  context.fill();
}

export default function DiffusionGraphOne() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [initialSimulation] = useState(() => createDiffusionSimulation({
    gridSize: DEFAULT_GRID_SIZE,
    linkChance: DEFAULT_LINK_CHANCE,
    seed: INITIAL_SEED,
  }));
  const simulationRef = useRef(initialSimulation);
  const radiusByNodeRef = useRef(new Float64Array());
  const gridSizeRef = useRef(DEFAULT_GRID_SIZE);
  const linkChanceRef = useRef(DEFAULT_LINK_CHANCE);
  const diffusionRateRef = useRef(DEFAULT_DIFFUSION_RATE);
  const tickRateRef = useRef(12);
  const runningRef = useRef(true);
  const keepRewiringRef = useRef(true);
  const seedRef = useRef(INITIAL_SEED);

  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [linkChance, setLinkChance] = useState(DEFAULT_LINK_CHANCE);
  const [diffusionRate, setDiffusionRate] = useState(DEFAULT_DIFFUSION_RATE);
  const [tickRate, setTickRate] = useState(12);
  const [isRunning, setIsRunning] = useState(true);
  const [keepRewiring, setKeepRewiring] = useState(true);
  const [readout, setReadout] = useState<DiffusionMetrics>(() =>
    diffusionMetrics(initialSimulation.graph, initialSimulation.state),
  );
  const [graphShape, setGraphShape] = useState(() => ({
    nodes: initialSimulation.graph.nodes.length,
    links: initialSimulation.graph.links.length,
  }));
  const [tick, setTick] = useState(0);

  const renderGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(bounds.width * pixelRatio);
    const pixelHeight = Math.round(bounds.height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const { graph, state } = simulationRef.current;
    const metrics = diffusionMetrics(graph, state);
    const worldScale = Math.min(bounds.width, bounds.height) / 20;
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    if (radiusByNodeRef.current.length !== graph.nodes.length) {
      radiusByNodeRef.current = new Float64Array(graph.nodes.length);
    }
    const radiusByNode = radiusByNodeRef.current;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = "#05080e";
    context.fillRect(0, 0, bounds.width, bounds.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const node of graph.nodes) {
      radiusByNode[node.id] = nodeDiameter(state.values[node.id] ?? 0, metrics.totalValue) * worldScale / 2;
    }

    for (let index = 0; index < graph.links.length; index += 1) {
      if (graph.activeLinks[index] !== 1) continue;
      const link = graph.links[index];
      if (!link) continue;
      const source = graph.nodes[link.source];
      const target = graph.nodes[link.target];
      if (!source || !target) continue;
      drawArrow(
        context,
        centerX + source.x * worldScale,
        centerY - source.y * worldScale,
        centerX + target.x * worldScale,
        centerY - target.y * worldScale,
        flowColour(state.flows[index] ?? 0, metrics.meanFlow),
        radiusByNode[target.id] ?? 0,
      );
    }

    for (const node of graph.nodes) {
      const radius = radiusByNode[node.id] ?? 0;
      context.beginPath();
      context.arc(centerX + node.x * worldScale, centerY - node.y * worldScale, radius, 0, Math.PI * 2);
      context.fillStyle = "#1769e0";
      context.fill();
    }
  }, []);

  const publish = useCallback(() => {
    const { graph, state } = simulationRef.current;
    setReadout(diffusionMetrics(graph, state));
    setTick(state.tick);
  }, []);

  const advance = useCallback((steps = 1, shouldPublish = true) => {
    const simulation = simulationRef.current;
    for (let step = 0; step < steps; step += 1) {
      if (keepRewiringRef.current) rewireOneLink(simulation.graph, simulation.state);
      stepDiffusion(simulation.graph, simulation.state, diffusionRateRef.current);
    }
    if (shouldPublish) publish();
  }, [publish]);

  const setup = useCallback((nextGridSize = gridSizeRef.current, nextLinkChance = linkChanceRef.current) => {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    simulationRef.current = createDiffusionSimulation({
      gridSize: nextGridSize,
      linkChance: nextLinkChance,
      seed: seedRef.current,
    });
    setGraphShape({
      nodes: simulationRef.current.graph.nodes.length,
      links: simulationRef.current.graph.links.length,
    });
    publish();
    renderGraph();
  }, [publish, renderGraph]);

  const rewire = useCallback(() => {
    const simulation = simulationRef.current;
    rewireOneLink(simulation.graph, simulation.state);
    publish();
    renderGraph();
  }, [publish, renderGraph]);

  const toggleRunning = useCallback(() => {
    setIsRunning((current) => {
      runningRef.current = !current;
      return !current;
    });
  }, []);

  const toggleKeepRewiring = useCallback(() => {
    setKeepRewiring((current) => {
      keepRewiringRef.current = !current;
      return !current;
    });
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let previous = performance.now();
    let pendingTicks = 0;
    let lastDraw = previous;
    let lastPublish = previous;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const frame = (now: number) => {
      const elapsed = Math.min(250, now - previous);
      previous = now;
      let advanced = false;
      if (runningRef.current && !reducedMotion.matches) {
        pendingTicks += elapsed * tickRateRef.current / 1_000;
        const ticks = Math.min(6, Math.floor(pendingTicks));
        if (ticks > 0) {
          pendingTicks -= ticks;
          advance(ticks, false);
          advanced = true;
        }
      } else {
        pendingTicks = 0;
      }
      if (advanced && now - lastDraw >= 1_000 / 30) {
        renderGraph();
        lastDraw = now;
      }
      if (advanced && now - lastPublish >= 150) {
        publish();
        lastPublish = now;
      }
      animationFrame = window.requestAnimationFrame(frame);
    };

    renderGraph();
    animationFrame = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [advance, publish, renderGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(renderGraph);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderGraph]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLButtonElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        toggleRunning();
      }
      if (event.key === ".") {
        event.preventDefault();
        advance();
        renderGraph();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [advance, renderGraph, toggleRunning]);

  const applyGridSize = (value: number) => {
    gridSizeRef.current = value;
    setGridSize(value);
    setup(value, linkChanceRef.current);
  };

  const applyLinkChance = (value: number) => {
    linkChanceRef.current = value;
    setLinkChance(value);
  };

  const applyDiffusionRate = (value: number) => {
    diffusionRateRef.current = value;
    setDiffusionRate(value);
  };

  const applyTickRate = (value: number) => {
    tickRateRef.current = value;
    setTickRate(value);
  };

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space ."
        aria-label="Directed network diffusion. Blue node area shows value; arrow brightness shows the amount that flowed through an active directed link in the current tick."
      />

      <section className={styles.controls} aria-label="Diffusion graph controls">
        <div className={styles.readout} aria-live="polite">
          <span>tick {tick}</span>
          <span>{graphShape.nodes} nodes</span>
          <span>{readout.activeLinkCount} / {graphShape.links} active links</span>
          <span>value {readout.totalValue.toFixed(2)}</span>
          <span>maximum {readout.maximumValue.toFixed(3)}</span>
        </div>

        <div className={styles.controlGroups}>
          <fieldset className={styles.controlGroup}>
            <legend>network</legend>
            <label className={styles.control}>
              <span>grid size</span>
              <input aria-label="Grid size" type="range" min="3" max="19" step="2" value={gridSize} onChange={(event) => applyGridSize(Number(event.target.value))} />
              <output>{gridSize}</output>
            </label>
            <label className={styles.control}>
              <span>link chance</span>
              <input aria-label="Link chance for next setup" type="range" min="0" max="100" step="1" value={linkChance} onChange={(event) => applyLinkChance(Number(event.target.value))} />
              <output>{linkChance}%</output>
            </label>
            <button type="button" onClick={() => setup()}>setup</button>
          </fieldset>

          <fieldset className={styles.controlGroup}>
            <legend>diffusion</legend>
            <label className={styles.control}>
              <span>diffusion rate</span>
              <input aria-label="Diffusion rate" type="range" min="0" max="100" step="1" value={diffusionRate} onChange={(event) => applyDiffusionRate(Number(event.target.value))} />
              <output>{diffusionRate}%</output>
            </label>
            <label className={styles.control}>
              <span>tick rate</span>
              <input aria-label="Ticks per second" type="range" min="1" max="30" step="1" value={tickRate} onChange={(event) => applyTickRate(Number(event.target.value))} />
              <output>{tickRate}/s</output>
            </label>
            <button type="button" onClick={toggleRunning}>{isRunning ? "pause" : "go"}</button>
            <button type="button" onClick={() => { advance(); renderGraph(); }}>one tick</button>
          </fieldset>

          <fieldset className={styles.controlGroup}>
            <legend>rewiring</legend>
            <button type="button" onClick={rewire}>rewire a link</button>
            <button type="button" aria-pressed={keepRewiring} onClick={toggleKeepRewiring}>keep rewiring: {keepRewiring ? "true" : "false"}</button>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
