"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ecological-voronoi.module.css";
import {
  createLivingVoronoiState,
  createVoronoiDiagram,
  defaultLivingVoronoiParameters,
  resizeLivingVoronoiState,
  stepLivingVoronoi,
  type LivingVoronoiParameters,
  type LivingVoronoiState,
  type Point,
  type VoronoiCell,
  type VoronoiSeed,
} from "./model";
import { faceVoronoiPortraitSources } from "./media/portraits";
import { faceVoronoiPoliticianSources } from "./media/politicians";

type PortraitMode = "face" | "politician";
type DisplayMode = "monochrome" | PortraitMode;
type PortraitImages = Map<string, HTMLImageElement>;
type PortraitLibraries = Record<PortraitMode, PortraitImages>;

const portraitSources: Record<PortraitMode, readonly string[]> = {
  face: faceVoronoiPortraitSources,
  politician: faceVoronoiPoliticianSources,
};

function tracePolygon(context: CanvasRenderingContext2D, polygon: Point[]) {
  if (polygon.length < 3) return false;
  context.beginPath();
  context.moveTo(polygon[0]!.x, polygon[0]!.y);
  for (let index = 1; index < polygon.length; index += 1) {
    const point = polygon[index]!;
    context.lineTo(point.x, point.y);
  }
  context.closePath();
  return true;
}

function portraitSize(cell: VoronoiCell, seed: VoronoiSeed) {
  const radius = cell.polygon.reduce(
    (largest, point) =>
      Math.max(largest, Math.hypot(point.x - seed.x, point.y - seed.y)),
    1,
  );
  return Math.max(Math.sqrt(cell.area) * 1.48, radius * 2.24);
}

function drawPortraitCover(
  context: CanvasRenderingContext2D,
  portrait: HTMLImageElement,
  seed: VoronoiSeed,
  size: number,
) {
  const scale = Math.max(size / portrait.naturalWidth, size / portrait.naturalHeight);
  const cropWidth = size / scale;
  const cropHeight = size / scale;

  context.drawImage(
    portrait,
    (portrait.naturalWidth - cropWidth) / 2,
    (portrait.naturalHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    seed.x - size / 2,
    seed.y - size / 2,
    size,
    size,
  );
}

function drawMonochrome(
  context: CanvasRenderingContext2D,
  state: LivingVoronoiState,
  cells: readonly VoronoiCell[],
) {
  context.fillStyle = "#f6f6f6";
  context.fillRect(0, 0, state.width, state.height);
  context.strokeStyle = "#080808";
  context.fillStyle = "#080808";
  context.lineWidth = Math.max(0.8, Math.min(state.width, state.height) * 0.001);
  context.lineJoin = "round";

  const seeds = new Map(state.seeds.map((seed) => [seed.id, seed]));
  for (const cell of cells) {
    if (!tracePolygon(context, cell.polygon)) continue;
    context.stroke();
    const seed = seeds.get(cell.seedId);
    if (!seed) continue;
    context.beginPath();
    context.arc(seed.x, seed.y, Math.max(1.4, context.lineWidth * 1.35), 0, Math.PI * 2);
    context.fill();
  }
}

function drawFace(
  context: CanvasRenderingContext2D,
  state: LivingVoronoiState,
  cells: readonly VoronoiCell[],
  sources: readonly string[],
  portraits: PortraitImages,
) {
  context.fillStyle = "#f6f6f6";
  context.fillRect(0, 0, state.width, state.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const seeds = new Map(state.seeds.map((seed) => [seed.id, seed]));
  const fallbackPortrait = portraits.values().next().value;
  for (const cell of cells) {
    const seed = seeds.get(cell.seedId);
    const source = sources[(cell.seedId - 1) % sources.length];
    const portrait = source ? portraits.get(source) ?? fallbackPortrait : fallbackPortrait;
    if (!seed || !portrait || !tracePolygon(context, cell.polygon)) continue;

    const size = portraitSize(cell, seed);
    context.save();
    context.clip();
    drawPortraitCover(context, portrait, seed, size);
    context.restore();
  }
}

function loadPortraits(
  sources: readonly string[],
  onUpdate: (portraits: PortraitImages) => void,
) {
  const portraits: PortraitImages = new Map();

  for (const source of sources) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      portraits.set(source, image);
      onUpdate(portraits);
    };
    image.src = source;
  }
}

export default function FaceVoronoiPopulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<LivingVoronoiState | null>(null);
  const portraitsRef = useRef<PortraitLibraries>({
    face: new Map(),
    politician: new Map(),
  });
  const modeRef = useRef<DisplayMode>("face");
  const parametersRef = useRef<LivingVoronoiParameters>(
    defaultLivingVoronoiParameters,
  );
  const [mode, setMode] = useState<DisplayMode>("face");
  const [parameters, setParameters] = useState<LivingVoronoiParameters>(
    defaultLivingVoronoiParameters,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame: number | null = null;
    let mounted = true;
    let previousTime = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let motionReduced = reducedMotion.matches;

    for (const portraitMode of ["face", "politician"] as const) {
      loadPortraits(portraitSources[portraitMode], (portraits) => {
        if (mounted) portraitsRef.current[portraitMode] = portraits;
      });
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stateRef.current = stateRef.current
        ? resizeLivingVoronoiState(
            stateRef.current,
            width,
            height,
            parametersRef.current,
          )
        : createLivingVoronoiState(width, height, undefined, parametersRef.current);
    };

    const render = (frameTime: number) => {
      const delta = Math.min((frameTime - previousTime) / 1_000, 0.05);
      previousTime = frameTime;
      const current = stateRef.current;
      if (current) {
        stateRef.current = motionReduced
          ? current
          : stepLivingVoronoi(current, delta, parametersRef.current);
        const next = stateRef.current;
        const diagram = createVoronoiDiagram(next.seeds, next.width, next.height);
        const currentMode = modeRef.current;
        if (currentMode === "monochrome") {
          drawMonochrome(context, next, diagram.cells);
        } else {
          drawFace(
            context,
            next,
            diagram.cells,
            portraitSources[currentMode],
            portraitsRef.current[currentMode],
          );
        }
      }
      animationFrame = requestAnimationFrame(render);
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      motionReduced = event.matches;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    reducedMotion.addEventListener("change", onMotionChange);
    resize();
    animationFrame = requestAnimationFrame(render);

    return () => {
      mounted = false;
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  }, []);

  const selectMode = (nextMode: DisplayMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
  };

  const updateParameter = <Key extends keyof LivingVoronoiParameters>(
    key: Key,
    value: LivingVoronoiParameters[Key],
  ) => {
    const next = { ...parametersRef.current, [key]: value };
    parametersRef.current = next;
    setParameters(next);
  };

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={
          mode === "monochrome"
            ? "A living monochrome Voronoi population that repeatedly grows and retracts between sparse and dense states."
            : `A living Voronoi population rendered with ${mode} portraits clipped to each changing cell.`
        }
      />
      <section
        className={styles.controls}
        data-mode={mode}
        aria-label="Voronoi population controls"
      >
        <div className={styles.toolbar}>
          <p className={styles.readout}>
            {parameters.minimumPopulation}–{parameters.maximumPopulation} · {parameters.tempo.toFixed(1)}x
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              aria-pressed={mode === "monochrome"}
              onClick={() => selectMode("monochrome")}
            >
              monochrome
            </button>
            <button
              type="button"
              aria-pressed={mode === "face"}
              onClick={() => selectMode("face")}
            >
              face
            </button>
            <button
              type="button"
              aria-pressed={mode === "politician"}
              onClick={() => selectMode("politician")}
            >
              politician
            </button>
          </div>
        </div>
        <div className={styles.parameters}>
          <label className={styles.control}>
            <span className={styles.controlHeader}>
              <span>minimum</span>
              <output>{parameters.minimumPopulation}</output>
            </span>
            <input
              type="range"
              min="6"
              max="30"
              step="1"
              value={parameters.minimumPopulation}
              onChange={(event) =>
                updateParameter("minimumPopulation", Number(event.target.value))
              }
            />
          </label>
          <label className={styles.control}>
            <span className={styles.controlHeader}>
              <span>maximum</span>
              <output>{parameters.maximumPopulation}</output>
            </span>
            <input
              type="range"
              min={parameters.minimumPopulation + 8}
              max="300"
              step="1"
              value={parameters.maximumPopulation}
              onChange={(event) =>
                updateParameter("maximumPopulation", Number(event.target.value))
              }
            />
          </label>
          <label className={styles.control}>
            <span className={styles.controlHeader}>
              <span>tempo</span>
              <output>{parameters.tempo.toFixed(1)}x</output>
            </span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={parameters.tempo}
              onChange={(event) =>
                updateParameter("tempo", Number(event.target.value))
              }
            />
          </label>
          <label className={styles.control}>
            <span className={styles.controlHeader}>
              <span>separation</span>
              <output>{parameters.separation.toFixed(2)}</output>
            </span>
            <input
              type="range"
              min="0.65"
              max="1.7"
              step="0.05"
              value={parameters.separation}
              onChange={(event) =>
                updateParameter("separation", Number(event.target.value))
              }
            />
          </label>
        </div>
      </section>
    </main>
  );
}
