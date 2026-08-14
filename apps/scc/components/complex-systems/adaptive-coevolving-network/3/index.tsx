"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./grid-adaptive.module.css";
import {
  createGridAdaptiveNetwork,
  DEFAULT_GRID_DIMENSION,
  DEFAULT_GRID_PARAMETERS,
  introduceGridSusceptibility,
  stepGridAdaptiveNetwork,
  type GridAdaptiveNetwork,
  type GridCoevolutionParameters,
  type GridSite,
} from "./model";

const SIMULATION_SPEED = 6;
const MAX_INTEGRATION_STEP = 0.05;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function siteColor(state: GridSite["state"], alpha = 1) {
  if (state === "R") return `rgba(164, 79, 52, ${alpha})`;
  if (state === "S") return `rgba(49, 100, 124, ${alpha})`;
  return `rgba(84, 96, 89, ${alpha})`;
}

function pointForSite(
  site: GridSite,
  dimension: number,
  width: number,
  height: number,
) {
  const margin = Math.max(24, Math.min(width, height) * 0.055);
  return {
    x: margin + ((site.column + 0.5) / dimension) * Math.max(1, width - margin * 2),
    y: margin + ((site.row + 0.5) / dimension) * Math.max(1, height - margin * 2),
  };
}

function drawNetwork(context: CanvasRenderingContext2D, network: GridAdaptiveNetwork) {
  const width = context.canvas.clientWidth;
  const height = context.canvas.clientHeight;
  context.clearRect(0, 0, width, height);
  const sitesById = new Map(network.sites.map((site) => [site.id, site]));
  context.fillStyle = "rgba(49, 63, 58, 0.11)";
  for (const site of network.sites) {
    if (site.state !== "inactive") continue;
    const point = pointForSite(site, network.dimension, width, height);
    context.fillRect(point.x - 0.5, point.y - 0.5, 1, 1);
  }
  for (const relation of network.relations) {
    const source = sitesById.get(relation.source);
    const target = sitesById.get(relation.target);
    if (!source || !target) continue;
    const sourcePoint = pointForSite(source, network.dimension, width, height);
    const targetPoint = pointForSite(target, network.dimension, width, height);
    const fresh = Math.max(0, 1 - (network.time - relation.changedAt) / 1.1);
    const recruitmentTie =
      (source.state === "R" && target.state === "S") ||
      (source.state === "S" && target.state === "R");
    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.lineTo(targetPoint.x, targetPoint.y);
    context.lineWidth = 0.45 + fresh * 0.9;
    context.strokeStyle = recruitmentTie
      ? `rgba(151, 79, 58, ${0.26 + fresh * 0.48})`
      : `rgba(42, 63, 61, ${0.14 + fresh * 0.34})`;
    context.stroke();
  }
  for (const site of network.sites) {
    if (site.state === "inactive") continue;
    const point = pointForSite(site, network.dimension, width, height);
    const fresh = Math.max(0, 1 - (network.time - site.changedAt) / 1.5);
    const radius = site.state === "R" ? 4.35 : site.state === "S" ? 3.75 : 3.1;
    if (fresh > 0) {
      context.beginPath();
      context.arc(point.x, point.y, radius + 3 + (1 - fresh) * 12, 0, Math.PI * 2);
      context.strokeStyle = siteColor(site.state, fresh * 0.55);
      context.lineWidth = 0.7;
      context.stroke();
    }
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    if (site.state === "S") {
      context.fillStyle = "rgba(235, 234, 228, 0.98)";
      context.fill();
      context.strokeStyle = siteColor(site.state, 0.92);
      context.lineWidth = 1.35;
      context.stroke();
    } else {
      context.fillStyle = siteColor(site.state, 0.9);
      context.fill();
    }
    if (site.state === "R") {
      context.beginPath();
      context.arc(point.x, point.y, radius + 2.1, 0, Math.PI * 2);
      context.strokeStyle = siteColor(site.state, 0.56);
      context.lineWidth = 0.7;
      context.stroke();
    }
  }
}

export default function GridAdaptiveThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<GridAdaptiveNetwork | null>(null);
  const parametersRef = useRef<GridCoevolutionParameters>(DEFAULT_GRID_PARAMETERS);
  const dimensionRef = useRef(DEFAULT_GRID_DIMENSION);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [parameters, setParameters] = useState(DEFAULT_GRID_PARAMETERS);
  const [dimension, setDimension] = useState(DEFAULT_GRID_DIMENSION);

  const reset = useCallback(() => {
    const network = createGridAdaptiveNetwork(dimensionRef.current);
    networkRef.current = network;
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  useEffect(() => {
    dimensionRef.current = dimension;
    reset();
  }, [dimension, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!networkRef.current) {
        const network = createGridAdaptiveNetwork(dimensionRef.current);
        networkRef.current = network;
      }
    };

    const render = (time: number) => {
      const delta = Math.min(((time - previousTime) / 1_000) * SIMULATION_SPEED, 0.18);
      previousTime = time;
      if (networkRef.current && !pausedRef.current && !reduceMotion.matches) {
        let remaining = delta;
        let network = networkRef.current;
        while (remaining > 0) {
          const result = stepGridAdaptiveNetwork(
            network,
            Math.min(remaining, MAX_INTEGRATION_STEP),
            parametersRef.current,
          );
          network = result.network;
          remaining -= MAX_INTEGRATION_STEP;
        }
        networkRef.current = network;
      }
      if (networkRef.current) {
        drawNetwork(context, networkRef.current);
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
  }, []);

  const intervene = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const network = networkRef.current;
    if (!canvas || !network) return;
    const bounds = canvas.getBoundingClientRect();
    const margin = Math.max(24, Math.min(bounds.width, bounds.height) * 0.055);
    const column = clamp(
      Math.floor(((clientX - bounds.left - margin) / Math.max(1, bounds.width - margin * 2)) * network.dimension),
      0,
      network.dimension - 1,
    );
    const row = clamp(
      Math.floor(((clientY - bounds.top - margin) / Math.max(1, bounds.height - margin * 2)) * network.dimension),
      0,
      network.dimension - 1,
    );
    networkRef.current = introduceGridSusceptibility(network, row, column);
  }, []);

  const setParameter = (name: keyof GridCoevolutionParameters, value: number) => {
    setParameters((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Grid-constrained open adaptive network. Every candidate site is fixed on an N by N lattice. Press a site to activate it as susceptible or make an existing non-susceptible node susceptible."
        role="application"
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          intervene(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) === 0) return;
          intervene(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          intervene(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }}
      />

      <section className={styles.controls} aria-label="Grid network controls">
        <label className={styles.range}>
          <span>grid N <output>{dimension}</output></span>
          <input
            max="50"
            min="16"
            step="1"
            type="range"
            value={dimension}
            onChange={(event) => setDimension(Number(event.target.value))}
          />
        </label>
        {(
          [
            ["recruitment", "recruitment"],
            ["rewiring", "rewiring"],
            ["activation", "activation"],
            ["turnover", "turnover"],
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
