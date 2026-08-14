"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./constellation.module.css";
import {
  createConstellationState,
  DEFAULT_CONSTELLATION_PARAMETERS,
  stepConstellation,
  supplyResource,
  type ConstellationParameters,
  type ConstellationState,
} from "./model";
import { approachStarRadius, starRadiusFromEnergy } from "./visual";

let resourceLayer: HTMLCanvasElement | null = null;

type ParameterControl = {
  id: keyof ConstellationParameters;
  label: string;
  minimum: number;
  maximum: number;
  step: number;
  digits: number;
};

const PARAMETER_CONTROLS: readonly ParameterControl[] = [
  {
    id: "resourceRegeneration",
    label: "resource return",
    minimum: 0,
    maximum: 0.06,
    step: 0.001,
    digits: 3,
  },
  {
    id: "metabolism",
    label: "energy cost",
    minimum: 0.008,
    maximum: 0.07,
    step: 0.001,
    digits: 3,
  },
  {
    id: "birthEnergy",
    label: "birth threshold",
    minimum: 0.55,
    maximum: 1.05,
    step: 0.01,
    digits: 2,
  },
  {
    id: "relationFormation",
    label: "relation forming",
    minimum: 0,
    maximum: 0.75,
    step: 0.01,
    digits: 2,
  },
  {
    id: "relationDecay",
    label: "relation declining",
    minimum: 0,
    maximum: 0.1,
    step: 0.002,
    digits: 3,
  },
];

function drawConstellation(
  context: CanvasRenderingContext2D,
  state: ConstellationState,
  width: number,
  height: number,
  energySizeEnabled: boolean,
  radiusMemory: Map<number, number>,
  delta: number,
) {
  context.fillStyle = "#02040a";
  context.fillRect(0, 0, width, height);
  resourceLayer ??= document.createElement("canvas");
  if (
    resourceLayer.width !== state.columns ||
    resourceLayer.height !== state.rows
  ) {
    resourceLayer.width = state.columns;
    resourceLayer.height = state.rows;
  }
  const resourceContext = resourceLayer.getContext("2d");
  resourceContext?.clearRect(0, 0, state.columns, state.rows);
  for (let row = 0; row < state.rows; row += 1) {
    for (let column = 0; column < state.columns; column += 1) {
      const resource = state.resource[row * state.columns + column] ?? 0;
      const density = Math.min(1, Math.max(0, resource - 0.48) / 0.67);
      if (!resourceContext || density <= 0) continue;
      resourceContext.fillStyle = `rgba(24, 52, 110, ${density * 0.5})`;
      resourceContext.fillRect(column, row, 1, 1);
    }
  }
  if (resourceContext) {
    context.save();
    context.filter = `blur(${Math.max(26, Math.min(width, height) * 0.055)}px)`;
    context.globalCompositeOperation = "screen";
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const overscan = Math.max(32, Math.min(width, height) * 0.07);
    context.drawImage(
      resourceLayer,
      -overscan,
      -overscan,
      width + overscan * 2,
      height + overscan * 2,
    );
    context.restore();
  }

  const stars = new Map(state.stars.map((star) => [star.id, star]));
  context.lineCap = "round";
  for (const relation of state.relations) {
    const source = stars.get(relation.source);
    const target = stars.get(relation.target);
    if (!source || !target) continue;
    const sourceX = source.x * width;
    const sourceY = source.y * height;
    const targetX = target.x * width;
    const targetY = target.y * height;
    const maturity = Math.min(1, relation.age / 1.2);
    context.beginPath();
    context.moveTo(sourceX, sourceY);
    context.lineTo(targetX, targetY);
    context.strokeStyle = `rgba(120, 146, 190, ${
      (0.045 + relation.strength * 0.48) * maturity
    })`;
    context.lineWidth = 0.35 + relation.strength * 0.95;
    context.stroke();

    const flowMagnitude = Math.min(1, Math.abs(relation.flow) / 0.055);
    if (flowMagnitude <= 0.025) continue;
    const phase = (state.time * (0.25 + flowMagnitude * 0.38) +
      relation.id * 0.193) % 1;
    const progress = relation.flow >= 0 ? phase : 1 - phase;
    const flowX = sourceX + (targetX - sourceX) * progress;
    const flowY = sourceY + (targetY - sourceY) * progress;
    context.beginPath();
    context.arc(flowX, flowY, 0.7 + flowMagnitude * 1.25, 0, Math.PI * 2);
    context.fillStyle = `rgba(210, 226, 255, ${0.36 + flowMagnitude * 0.6})`;
    context.shadowColor = "rgba(132, 174, 255, 0.86)";
    context.shadowBlur = 5 + flowMagnitude * 7;
    context.fill();
    context.shadowBlur = 0;
  }

  const livingStarIds = new Set<number>();
  for (const star of state.stars) {
    livingStarIds.add(star.id);
    const x = star.x * width;
    const y = star.y * height;
    const energy = Math.min(1, star.energy / 0.9);
    const birthScale = Math.min(1, star.age / 0.8);
    const targetRadius = starRadiusFromEnergy(
      star.energy,
      energySizeEnabled,
    );
    const previousRadius = radiusMemory.get(star.id) ?? targetRadius;
    const settledRadius = approachStarRadius(
      previousRadius,
      targetRadius,
      delta,
    );
    radiusMemory.set(star.id, settledRadius);
    const radius = settledRadius * birthScale;

    context.beginPath();
    context.arc(x, y, radius * (2.1 + star.activity * 0.8), 0, Math.PI * 2);
    context.fillStyle = `rgba(137, 171, 225, ${0.025 + energy * 0.075})`;
    context.shadowColor = `rgba(132, 174, 255, ${0.2 + energy * 0.48})`;
    context.shadowBlur = 9 + energy * 14;
    context.fill();
    context.shadowBlur = 0;

    context.beginPath();
    context.arc(x, y, Math.max(0.35, radius), 0, Math.PI * 2);
    context.fillStyle = `rgba(242, 246, 255, ${0.38 + energy * 0.62})`;
    context.fill();

    context.beginPath();
    context.arc(x - radius * 0.22, y - radius * 0.22, radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = `rgba(255, 255, 255, ${0.38 + energy * 0.56})`;
    context.fill();
  }
  for (const id of radiusMemory.keys()) {
    if (!livingStarIds.has(id)) radiusMemory.delete(id);
  }
}

export default function ConstellationOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef<ConstellationState>(createConstellationState());
  const radiusMemoryRef = useRef(new Map<number, number>());
  const pausedRef = useRef(false);
  const energySizeRef = useRef(true);
  const parametersRef = useRef<ConstellationParameters>({
    ...DEFAULT_CONSTELLATION_PARAMETERS,
  });
  const [parameters, setParameters] = useState<ConstellationParameters>({
    ...DEFAULT_CONSTELLATION_PARAMETERS,
  });
  const [paused, setPaused] = useState(false);
  const [energySizeEnabled, setEnergySizeEnabled] = useState(true);

  const reset = useCallback(() => {
    stateRef.current = createConstellationState();
    radiusMemoryRef.current.clear();
  }, []);

  const setEnergySize = useCallback((enabled: boolean) => {
    energySizeRef.current = enabled;
    setEnergySizeEnabled(enabled);
  }, []);

  const togglePaused = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const setParameter = useCallback((
    id: keyof ConstellationParameters,
    value: number,
  ) => {
    const next = { ...parametersRef.current, [id]: value };
    parametersRef.current = next;
    setParameters(next);
  }, []);

  const supply = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    stateRef.current = supplyResource(stateRef.current, {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTime = performance.now();

    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target;
      const isControl = target instanceof HTMLInputElement ||
        target instanceof HTMLButtonElement;
      if (event.code === "Space" && !isControl) {
        event.preventDefault();
        togglePaused();
      }
      if (event.key.toLowerCase() === "r" && !isControl) reset();
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1_000, 0.05);
      previousTime = time;
      if (!pausedRef.current && !reducedMotion.matches) {
        for (let substep = 0; substep < 3; substep += 1) {
          const result = stepConstellation(
            stateRef.current,
            elapsed * 1.3,
            parametersRef.current,
          );
          stateRef.current = result.state;
        }
      }

      const bounds = canvas.getBoundingClientRect();
      drawConstellation(
        context,
        stateRef.current,
        bounds.width,
        bounds.height,
        energySizeRef.current,
        radiusMemoryRef.current,
        reducedMotion.matches ? 0.1 : elapsed,
      );
      frameRef.current = requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("keydown", handleKeydown);
    resize();
    frameRef.current = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", handleKeydown);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reset, togglePaused]);

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={supply}
        role="application"
        tabIndex={0}
        aria-keyshortcuts="Space R"
        aria-label="Living constellation. Press the field to supply local resource. Press Space to pause or resume, and R to reseed."
      />
      <section className={styles.controls} aria-label="Simulation parameters">
        <div className={styles.actions}>
          <button type="button" onClick={togglePaused}>
            {paused ? "resume" : "pause"}
          </button>
          <button type="button" onClick={reset}>restart</button>
        </div>
        {PARAMETER_CONTROLS.map((control) => (
          <label className={styles.parameter} key={control.id}>
            <span className={styles.parameterLabel}>
              <span>{control.label}</span>
              <output>{parameters[control.id].toFixed(control.digits)}</output>
            </span>
            <input
              type="range"
              min={control.minimum}
              max={control.maximum}
              step={control.step}
              value={parameters[control.id]}
              onChange={(event) => {
                setParameter(control.id, event.currentTarget.valueAsNumber);
              }}
            />
          </label>
        ))}
        <label className={styles.visualOption}>
          <span>energy size</span>
          <input
            type="checkbox"
            checked={energySizeEnabled}
            onChange={(event) => setEnergySize(event.currentTarget.checked)}
          />
        </label>
      </section>
    </main>
  );
}
