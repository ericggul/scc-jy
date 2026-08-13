"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./adaptive-coevolving-network.module.css";
import {
  applyOpinionField,
  createAdaptiveNetwork,
  DEFAULT_PARAMETERS,
  measureNetwork,
  resizeAdaptiveNetwork,
  stepAdaptiveNetwork,
  type AdaptiveMetrics,
  type AdaptiveNetwork,
  type AdaptiveParameters,
  type Point,
} from "./model";

type Intervention = Point & {
  targetOpinion: number;
  createdAt: number;
};

const EMPTY_METRICS: AdaptiveMetrics = {
  mean: 0,
  polarization: 0,
  discordantShare: 0,
  components: 1,
  assimilations: 0,
  rewires: 0,
};

function mixChannel(from: number, to: number, amount: number) {
  return Math.round(from + (to - from) * amount);
}

function opinionColor(opinion: number, alpha = 1) {
  const negative = [47, 91, 122] as const;
  const neutral = [79, 80, 72] as const;
  const positive = [171, 78, 51] as const;
  const amount = Math.abs(opinion);
  const from = neutral;
  const to = opinion < 0 ? negative : positive;
  return `rgba(${mixChannel(from[0], to[0], amount)}, ${mixChannel(from[1], to[1], amount)}, ${mixChannel(from[2], to[2], amount)}, ${alpha})`;
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  network: AdaptiveNetwork,
  parameters: AdaptiveParameters,
  intervention: Intervention | null,
  now: number,
) {
  const width = context.canvas.clientWidth;
  const height = context.canvas.clientHeight;
  const nodes = new Map(network.nodes.map((node) => [node.id, node]));
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.strokeStyle = "rgba(23, 25, 21, 0.075)";
  context.lineWidth = 1;
  context.stroke();

  const orderedEdges = [...network.edges].sort(
    (first, second) => second.discord - first.discord,
  );
  for (const edge of orderedEdges) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) continue;
    const disagreement = Math.min(1, edge.discord / 2);
    const isDiscordant = edge.discord > parameters.confidence;
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.strokeStyle = isDiscordant
      ? `rgba(135, 68, 47, ${0.075 + disagreement * 0.2})`
      : `rgba(23, 25, 21, ${0.055 + edge.weight * 0.17})`;
    context.lineWidth = edge.age < 0.24 ? 1.8 : 0.45 + edge.weight * 0.65;
    context.stroke();
  }

  for (const node of network.nodes) {
    context.beginPath();
    context.arc(node.x, node.y, 2.5 + node.susceptibility * 2.2, 0, Math.PI * 2);
    context.fillStyle = opinionColor(node.opinion, 0.94);
    context.fill();
  }

  if (intervention && now - intervention.createdAt < 620) {
    const progress = (now - intervention.createdAt) / 620;
    context.beginPath();
    context.arc(intervention.x, intervention.y, 52 + progress * 34, 0, Math.PI * 2);
    context.strokeStyle = opinionColor(
      intervention.targetOpinion,
      Math.max(0, 0.42 * (1 - progress)),
    );
    context.lineWidth = 1;
    context.stroke();
  }
}

function formatSigned(value: number) {
  if (Math.abs(value) < 0.005) return "0.00";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;
}

function ParameterControl({
  label,
  value,
  minimum,
  maximum,
  step,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.parameter}>
      <span>{label}</span>
      <output>{value.toFixed(step < 0.01 ? 3 : 2)}</output>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export default function AdaptiveCoevolvingNetworkOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<AdaptiveNetwork | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pausedRef = useRef(false);
  const parametersRef = useRef<AdaptiveParameters>(DEFAULT_PARAMETERS);
  const interventionRef = useRef<Intervention | null>(null);
  const pointerActiveRef = useRef(false);
  const seedRef = useRef(0x6d2b79f5);
  const eventTotalsRef = useRef({ assimilations: 0, rewires: 0 });
  const [paused, setPaused] = useState(false);
  const [parameters, setParameters] = useState(DEFAULT_PARAMETERS);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);

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
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      networkRef.current = networkRef.current
        ? resizeAdaptiveNetwork(networkRef.current, sizeRef.current, nextSize)
        : createAdaptiveNetwork(bounds.width, bounds.height, seedRef.current);
      sizeRef.current = nextSize;
      setMetrics(measureNetwork(networkRef.current, parametersRef.current));
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.035);
      previousTime = time;
      if (networkRef.current && !pausedRef.current && !reduceMotion.matches) {
        const result = stepAdaptiveNetwork(
          networkRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
          parametersRef.current,
        );
        networkRef.current = result.network;
        eventTotalsRef.current.assimilations += result.metrics.assimilations;
        eventTotalsRef.current.rewires += result.metrics.rewires;
      }
      if (networkRef.current) {
        drawNetwork(
          context,
          networkRef.current,
          parametersRef.current,
          interventionRef.current,
          time,
        );
        if (time - readoutTime > 300) {
          setMetrics(
            measureNetwork(
              networkRef.current,
              parametersRef.current,
              eventTotalsRef.current,
            ),
          );
          eventTotalsRef.current = { assimilations: 0, rewires: 0 };
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

  const intervene = (point: Point) => {
    const network = networkRef.current;
    if (!network) return;
    const targetOpinion = Math.min(
      1,
      Math.max(-1, (point.x / Math.max(1, sizeRef.current.width)) * 2 - 1),
    );
    networkRef.current = applyOpinionField(
      network,
      point,
      targetOpinion,
      Math.min(108, Math.max(68, sizeRef.current.width * 0.09)),
    );
    interventionRef.current = {
      ...point,
      targetOpinion,
      createdAt: performance.now(),
    };
  };

  const updateParameter = (
    key: keyof AdaptiveParameters,
    value: number,
  ) => {
    setParameters((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    seedRef.current = (seedRef.current + 0x9e3779b9) >>> 0;
    networkRef.current = createAdaptiveNetwork(
      sizeRef.current.width,
      sizeRef.current.height,
      seedRef.current,
    );
    eventTotalsRef.current = { assimilations: 0, rewires: 0 };
    setMetrics(measureNetwork(networkRef.current, parametersRef.current));
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="An adaptive network. Horizontal position encodes each node's state. Drag across the field to influence nearby nodes; relations then adapt to the changed states."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointerActiveRef.current = true;
          const bounds = event.currentTarget.getBoundingClientRect();
          intervene({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        }}
        onPointerMove={(event) => {
          if (!pointerActiveRef.current) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          intervene({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        }}
        onPointerUp={() => {
          pointerActiveRef.current = false;
        }}
        onPointerCancel={() => {
          pointerActiveRef.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          intervene({
            x: event.currentTarget.clientWidth / 2,
            y: event.currentTarget.clientHeight / 2,
          });
        }}
      />

      <header className={styles.header}>
        <h1>adaptive coevolving network</h1>
        <p><span>−1</span><span>state</span><span>+1</span></p>
      </header>

      <section className={styles.readout} aria-label="Network measures">
        <dl>
          <div><dt>mean</dt><dd>{formatSigned(metrics.mean)}</dd></div>
          <div><dt>spread</dt><dd>{metrics.polarization.toFixed(2)}</dd></div>
          <div><dt>discord</dt><dd>{Math.round(metrics.discordantShare * 100)}%</dd></div>
          <div><dt>groups</dt><dd>{metrics.components}</dd></div>
          <div><dt>adapt</dt><dd>{metrics.rewires}</dd></div>
          <div><dt>agree</dt><dd>{metrics.assimilations}</dd></div>
        </dl>
      </section>

      <section className={styles.controls} aria-label="Simulation controls">
        <div className={styles.parameters}>
          <ParameterControl
            label="confidence"
            value={parameters.confidence}
            minimum={0.08}
            maximum={1.2}
            step={0.01}
            onChange={(value) => updateParameter("confidence", value)}
          />
          <ParameterControl
            label="rewiring"
            value={parameters.adaptation}
            minimum={0}
            maximum={1}
            step={0.01}
            onChange={(value) => updateParameter("adaptation", value)}
          />
          <ParameterControl
            label="drift"
            value={parameters.noise}
            minimum={0}
            maximum={0.05}
            step={0.001}
            onChange={(value) => updateParameter("noise", value)}
          />
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={reset}>reset</button>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "continue" : "pause"}
          </button>
        </div>
      </section>
    </main>
  );
}
