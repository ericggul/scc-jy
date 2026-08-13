"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./hypertext-network.module.css";
import {
  createHypertextNetwork,
  resizeHypertextNetwork,
  seedHypertextFragment,
  stepHypertextNetwork,
  type HypertextEvents,
  type HypertextFragment,
  type HypertextNetwork,
  type Point,
} from "./model";

type Intervention = Point & { expiresAt: number };

const EMPTY_EVENTS: HypertextEvents = {
  born: 0,
  pruned: 0,
  rewritten: 0,
  crossings: 0,
};

function hitFragment(
  fragments: readonly HypertextFragment[],
  point: Point | null,
) {
  if (!point) return null;
  return fragments
    .filter((fragment) => Math.hypot(fragment.x - point.x, fragment.y - point.y) < 42)
    .sort(
      (first, second) =>
        Math.hypot(first.x - point.x, first.y - point.y) -
        Math.hypot(second.x - point.x, second.y - point.y),
    )[0] ?? null;
}

function drawLines(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maximumWidth: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maximumWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === 2) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < 2) lines.push(line);
  lines.slice(0, 2).forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * 10);
  });
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  network: HypertextNetwork,
  pointer: Point | null,
  interventions: readonly Intervention[],
  now: number,
) {
  const width = context.canvas.clientWidth;
  const height = context.canvas.clientHeight;
  context.clearRect(0, 0, width, height);
  context.textBaseline = "alphabetic";
  const fragments = new Map(network.fragments.map((fragment) => [fragment.id, fragment]));
  const hovered = hitFragment(network.fragments, pointer);

  for (const link of network.links) {
    const source = fragments.get(link.source);
    const target = fragments.get(link.target);
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const bend = ((link.id % 5) - 2) * 4.4;
    const midpointX = (source.x + target.x) / 2 + (-dy / length) * bend;
    const midpointY = (source.y + target.y) / 2 + (dx / length) * bend;
    context.beginPath();
    context.moveTo(source.x, source.y - 3);
    context.quadraticCurveTo(midpointX, midpointY, target.x, target.y - 3);
    context.strokeStyle = `rgba(23, 32, 28, ${0.045 + link.strength * 0.2 + link.traffic * 0.22})`;
    context.lineWidth = 0.35 + link.traffic * 0.8;
    context.stroke();
  }

  for (const reader of network.readers) {
    const source = fragments.get(reader.from);
    const target = fragments.get(reader.to);
    if (!source || !target) continue;
    const x = source.x + (target.x - source.x) * reader.progress;
    const y = source.y + (target.y - source.y) * reader.progress - 3;
    context.beginPath();
    context.arc(x, y, 1.35, 0, Math.PI * 2);
    context.fillStyle = "rgba(70, 105, 111, 0.92)";
    context.fill();
  }

  context.font = "500 8px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (const fragment of network.fragments) {
    const active = hovered?.id === fragment.id;
    const alpha = 0.3 + fragment.attention * 0.67;
    context.fillStyle = active
      ? "rgba(70, 105, 111, 1)"
      : `rgba(23, 32, 28, ${alpha})`;
    context.fillText(fragment.terms.join(" / "), fragment.x, fragment.y);
    context.font = "400 8px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = active
      ? "rgba(23, 32, 28, 0.92)"
      : `rgba(23, 32, 28, ${0.18 + fragment.attention * 0.44})`;
    drawLines(context, fragment.phrase, fragment.x, fragment.y + 12, 112);
    context.beginPath();
    context.arc(fragment.x - 7, fragment.y - 2, 1.6 + fragment.attention * 1.8, 0, Math.PI * 2);
    context.fillStyle = active
      ? "rgba(70, 105, 111, 0.95)"
      : `rgba(23, 32, 28, ${0.25 + fragment.attention * 0.54})`;
    context.fill();
    context.font = "500 8px ui-monospace, SFMono-Regular, Menlo, monospace";
  }

  for (const intervention of interventions) {
    const remaining = Math.max(0, (intervention.expiresAt - now) / 1150);
    context.beginPath();
    context.arc(intervention.x, intervention.y, 18 + (1 - remaining) * 34, 0, Math.PI * 2);
    context.strokeStyle = `rgba(145, 79, 59, ${remaining * 0.38})`;
    context.lineWidth = 0.7;
    context.stroke();
  }
}

export default function HypertextNetworkOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const networkRef = useRef<HypertextNetwork | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pointerRef = useRef<Point | null>(null);
  const interventionsRef = useRef<Intervention[]>([]);
  const pausedRef = useRef(false);
  const accumulatedEventsRef = useRef<HypertextEvents>({ ...EMPTY_EVENTS });
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState({
    fragments: 20,
    links: 24,
    readers: 13,
    events: EMPTY_EVENTS,
  });

  const refreshReadout = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    setReadout({
      fragments: network.fragments.length,
      links: network.links.length,
      readers: network.readers.length,
      events: accumulatedEventsRef.current,
    });
    accumulatedEventsRef.current = { ...EMPTY_EVENTS };
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();
    let previousReadout = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!networkRef.current) {
        networkRef.current = createHypertextNetwork(bounds.width, bounds.height);
      } else {
        networkRef.current = resizeHypertextNetwork(
          networkRef.current,
          sizeRef.current,
          nextSize,
        );
      }
      sizeRef.current = nextSize;
      refreshReadout();
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      interventionsRef.current = interventionsRef.current.filter(
        (intervention) => intervention.expiresAt > time,
      );
      if (networkRef.current && !pausedRef.current && !reducedMotion.matches) {
        const result = stepHypertextNetwork(
          networkRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
        );
        networkRef.current = result.network;
        const events = accumulatedEventsRef.current;
        accumulatedEventsRef.current = {
          born: events.born + result.events.born,
          pruned: events.pruned + result.events.pruned,
          rewritten: events.rewritten + result.events.rewritten,
          crossings: events.crossings + result.events.crossings,
        };
      }
      if (networkRef.current) {
        drawNetwork(
          context,
          networkRef.current,
          pointerRef.current,
          interventionsRef.current,
          time,
        );
        if (time - previousReadout > 440) {
          refreshReadout();
          previousReadout = time;
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
  }, [refreshReadout]);

  const plantFragment = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const network = networkRef.current;
    if (!canvas || !network) return;
    const bounds = canvas.getBoundingClientRect();
    const point = { x: clientX - bounds.left, y: clientY - bounds.top };
    networkRef.current = seedHypertextFragment(network, point);
    interventionsRef.current = [
      ...interventionsRef.current.slice(-4),
      { ...point, expiresAt: performance.now() + 1150 },
    ];
    accumulatedEventsRef.current = {
      ...accumulatedEventsRef.current,
      born: accumulatedEventsRef.current.born + 1,
    };
    refreshReadout();
  }, [refreshReadout]);

  const reset = useCallback(() => {
    networkRef.current = createHypertextNetwork(
      sizeRef.current.width,
      sizeRef.current.height,
    );
    interventionsRef.current = [];
    accumulatedEventsRef.current = { ...EMPTY_EVENTS };
    refreshReadout();
  }, [refreshReadout]);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A self-evolving network of hypertext fragments. Press the field to add a new fragment and watch it attach to nearby text."
        tabIndex={0}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
        }}
        onPointerLeave={() => {
          pointerRef.current = null;
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          plantFragment(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          plantFragment(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2,
          );
        }}
      />

      <header className={styles.header}>
        <h1>hypertext network</h1>
        <p>press to leave a page in the field</p>
      </header>

      <section className={styles.readout} aria-label="Hypertext network controls and activity">
        <dl>
          <div><dt>fragments</dt><dd>{readout.fragments}</dd></div>
          <div><dt>links</dt><dd>{readout.links}</dd></div>
          <div><dt>readers</dt><dd>{readout.readers}</dd></div>
          <div><dt>new</dt><dd>{readout.events.born}</dd></div>
          <div><dt>faded</dt><dd>{readout.events.pruned}</dd></div>
          <div><dt>rewritten</dt><dd>{readout.events.rewritten}</dd></div>
        </dl>
        <div className={styles.actions}>
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={reset}>reset</button>
        </div>
      </section>
    </main>
  );
}
