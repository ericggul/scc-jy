"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./portrait-field.module.css";
import {
  createPortraitFieldState,
  createVoronoiDiagram,
  resizePortraitFieldState,
  stepPortraitField,
  type PortraitFieldState,
  type VoronoiDiagram,
  type VoronoiSeed,
} from "./living-field";
import { FACE_PORTRAITS, type FacePortrait } from "./portrait-ledger";

type PortraitImages = Map<string, HTMLImageElement>;

function tracePolygon(
  context: CanvasRenderingContext2D,
  polygon: VoronoiDiagram["cells"][number]["polygon"],
) {
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

function getPortraitSize(
  polygon: VoronoiDiagram["cells"][number]["polygon"],
  seed: VoronoiSeed,
  area: number,
) {
  const radius = polygon.reduce(
    (largest, point) =>
      Math.max(largest, Math.hypot(point.x - seed.x, point.y - seed.y)),
    1,
  );

  return Math.max(Math.sqrt(area) * 1.48, radius * 2.24);
}

function drawPortraitField(
  context: CanvasRenderingContext2D,
  state: PortraitFieldState,
  portraits: PortraitImages,
  showBorders: boolean,
) {
  const { voronoi, portraitBySeedId } = state;
  const diagram = createVoronoiDiagram(
    voronoi.seeds,
    voronoi.width,
    voronoi.height,
  );
  const seeds = new Map(voronoi.seeds.map((seed) => [seed.id, seed]));

  context.fillStyle = "#0b0909";
  context.fillRect(0, 0, voronoi.width, voronoi.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const cell of diagram.cells) {
    const seed = seeds.get(cell.seedId);
    const portraitId = portraitBySeedId[cell.seedId];
    const image = portraitId ? portraits.get(portraitId) : undefined;
    if (!seed || !image || !tracePolygon(context, cell.polygon)) continue;

    const size = getPortraitSize(cell.polygon, seed, cell.area);
    context.save();
    context.clip();
    context.drawImage(
      image,
      seed.x - size / 2,
      seed.y - size / 2,
      size,
      size,
    );
    context.restore();
  }

  if (!showBorders) return;

  const edgeWidth = Math.max(
    1,
    Math.min(voronoi.width, voronoi.height) * 0.0012,
  );
  for (const cell of diagram.cells) {
    if (!tracePolygon(context, cell.polygon)) continue;
    context.lineWidth = edgeWidth;
    context.strokeStyle = "#000";
    context.stroke();
  }
}

function loadPortraits(portraits: readonly FacePortrait[]) {
  return Promise.all(
    portraits.map(
      (portrait) =>
        new Promise<[string, HTMLImageElement] | null>((resolve) => {
          const image = new Image();
          image.decoding = "async";
          image.onload = async () => {
            try {
              await image.decode();
            } catch {
              // A successfully loaded image can still be drawn.
            }
            resolve([portrait.id, image]);
          };
          image.onerror = () => resolve(null);
          image.src = portrait.src;
        }),
    ),
  ).then(
    (entries) =>
      new Map(
        entries.filter(
          (entry): entry is [string, HTMLImageElement] => entry !== null,
        ),
      ),
  );
}

export default function FaceVoronoiPortraitField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PortraitFieldState | null>(null);
  const portraitsRef = useRef<PortraitImages>(new Map());
  const bordersRef = useRef(true);
  const [showBorders, setShowBorders] = useState(true);

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
    const portraitIds = FACE_PORTRAITS.map((portrait) => portrait.id);

    void loadPortraits(FACE_PORTRAITS).then((portraits) => {
      if (mounted) portraitsRef.current = portraits;
    });

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      stateRef.current = stateRef.current
        ? resizePortraitFieldState(stateRef.current, width, height)
        : createPortraitFieldState(width, height, portraitIds);
    };

    const render = (frameTime: number) => {
      const delta = Math.min((frameTime - previousTime) / 1_000, 0.05);
      previousTime = frameTime;
      const current = stateRef.current;

      if (current) {
        stateRef.current = motionReduced
          ? current
          : stepPortraitField(current, delta, portraitIds);
        drawPortraitField(
          context,
          stateRef.current,
          portraitsRef.current,
          bordersRef.current,
        );
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

  const setBorderMode = (nextShowBorders: boolean) => {
    bordersRef.current = nextShowBorders;
    setShowBorders(nextShowBorders);
  };

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="High-resolution individual portrait images partitioned by a living Voronoi field."
      />
      <section className={styles.controls} aria-label="Voronoi border test">
        <p className={styles.readout}>living portrait field</p>
        <div className={styles.actions}>
          <button
            type="button"
            aria-pressed={showBorders}
            onClick={() => setBorderMode(true)}
          >
            black border
          </button>
          <button
            type="button"
            aria-pressed={!showBorders}
            onClick={() => setBorderMode(false)}
          >
            no border
          </button>
        </div>
      </section>
    </main>
  );
}
