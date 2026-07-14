"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./swarm.module.css";
import {
  createFlock,
  stepFlock,
  type Boid,
  type Point,
  type RuleWeights,
} from "./model";

const FLOCK_SIZE = 500;
const DEFAULT_WEIGHTS: RuleWeights = {
  separation: 1.15,
  alignment: 0.82,
  cohesion: 0.72,
};

type RuleName = keyof RuleWeights;

const RULES: Array<{ name: RuleName; label: string; min: number; max: number }> = [
  { name: "separation", label: "separate", min: 0.2, max: 1.8 },
  { name: "alignment", label: "align", min: 0, max: 1.6 },
  { name: "cohesion", label: "gather", min: 0, max: 1.4 },
];

function drawFlock(context: CanvasRenderingContext2D, flock: Boid[]) {
  const halfLength = 3.5;
  const wing = 2.3;

  context.beginPath();

  for (const boid of flock) {
    const inverseSpeed = 1 / Math.hypot(boid.vx, boid.vy);
    const directionX = boid.vx * inverseSpeed;
    const directionY = boid.vy * inverseSpeed;
    const noseX = boid.x + directionX * halfLength;
    const noseY = boid.y + directionY * halfLength;
    const tailX = boid.x - directionX * halfLength;
    const tailY = boid.y - directionY * halfLength;
    const perpendicularX = -directionY * wing;
    const perpendicularY = directionX * wing;

    context.moveTo(noseX, noseY);
    context.lineTo(tailX + perpendicularX, tailY + perpendicularY);
    context.moveTo(noseX, noseY);
    context.lineTo(tailX - perpendicularX, tailY - perpendicularY);
  }

  context.stroke();
}

export default function SwarmOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const flockRef = useRef<Boid[]>([]);
  const attentionTargetsRef = useRef<Point[]>([]);
  const weightsRef = useRef<RuleWeights>(DEFAULT_WEIGHTS);
  const pausedRef = useRef(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [paused, setPaused] = useState(false);

  const resetFlock = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    flockRef.current = createFlock(FLOCK_SIZE, canvas.clientWidth, canvas.clientHeight);
  }, []);

  useEffect(() => {
    weightsRef.current = weights;
  }, [weights]);

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
    let previousBounds: { width: number; height: number } | null = null;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      if (previousBounds) {
        const oldBounds = previousBounds;
        attentionTargetsRef.current = attentionTargetsRef.current.map((target) => ({
          x: target.x * (bounds.width / oldBounds.width),
          y: target.y * (bounds.height / oldBounds.height),
        }));
      }

      previousBounds = { width: bounds.width, height: bounds.height };
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      flockRef.current = createFlock(FLOCK_SIZE, bounds.width, bounds.height);
      context.fillStyle = "#f0f1ec";
      context.fillRect(0, 0, bounds.width, bounds.height);
    };

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;

      context.fillStyle = "rgba(240, 241, 236, 0.2)";
      context.fillRect(0, 0, width, height);

      if (!pausedRef.current && !reduceMotion.matches) {
        flockRef.current = stepFlock(
          flockRef.current,
          width,
          height,
          delta,
          weightsRef.current,
          attentionTargetsRef.current,
        );
      }

      context.strokeStyle = "rgba(24, 25, 22, 0.78)";
      context.lineWidth = 1;
      context.lineCap = "round";
      drawFlock(context, flockRef.current);

      for (const attentionTarget of attentionTargetsRef.current) {
        context.beginPath();
        context.arc(attentionTarget.x, attentionTarget.y, 4.5, 0, Math.PI * 2);
        context.strokeStyle = "rgba(24, 25, 22, 0.48)";
        context.lineWidth = 1;
        context.stroke();
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

  const updateRule = (name: RuleName, value: number) => {
    setWeights((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A flock moving according to separation, alignment, and cohesion. Click to add attention points."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          attentionTargetsRef.current = [
            ...attentionTargetsRef.current,
            {
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            },
          ];
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          attentionTargetsRef.current = [
            ...attentionTargetsRef.current,
            {
              x: event.currentTarget.clientWidth / 2,
              y: event.currentTarget.clientHeight / 2,
            },
          ];
        }}
      />

      <details className={styles.controls}>
        <summary>rules</summary>
        <section className={styles.controlBody} aria-label="Swarm rules">
          <div className={styles.rules}>
            {RULES.map((rule) => (
              <label className={styles.rule} key={rule.name}>
                <span>{rule.label}</span>
                <input
                  type="range"
                  min={rule.min}
                  max={rule.max}
                  step="0.01"
                  value={weights[rule.name]}
                  onChange={(event) =>
                    updateRule(rule.name, Number(event.target.value))
                  }
                />
              </label>
            ))}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => setPaused((current) => !current)}>
              {paused ? "continue" : "pause"}
            </button>
            <button type="button" onClick={resetFlock}>
              begin again
            </button>
            <button
              type="button"
              onClick={() => {
                attentionTargetsRef.current = [];
              }}
            >
              clear points
            </button>
          </div>
        </section>
      </details>
    </main>
  );
}
