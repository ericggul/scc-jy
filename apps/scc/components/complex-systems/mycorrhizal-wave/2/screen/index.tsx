"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FIELD_HEIGHT_MM,
  FIELD_WIDTH_MM,
  simulateWaveReplicate,
  snapshotAt,
  type WaveSnapshot,
} from "../model";
import styles from "./replicate-wave.module.css";

const WINDOW_HOURS = 30;
const START_HOURS = [0, 30, 60] as const;
const REPLICATES = [
  { id: "822", seed: 8_222_023 },
  { id: "918", seed: 9_182_023 },
  { id: "866", seed: 8_662_023 },
] as const;
const CANVAS_WIDTH = 930;
const CANVAS_HEIGHT = 364;
const HOURS_PER_SECOND = 5;

function clampOffset(value: number) {
  return Math.min(WINDOW_HOURS, Math.max(0, value));
}

function drawSnapshot(canvas: HTMLCanvasElement, snapshot: WaveSnapshot) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = CANVAS_WIDTH * ratio;
  canvas.height = CANVAS_HEIGHT * ratio;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.scale(ratio, ratio);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.strokeStyle = "#7e8cca";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 0.82;
  context.globalAlpha = 0.86;
  context.beginPath();

  const xScale = CANVAS_WIDTH / FIELD_WIDTH_MM;
  const yScale = CANVAS_HEIGHT / FIELD_HEIGHT_MM;
  for (const [x1, y1, x2, y2] of snapshot.segments) {
    context.moveTo(x1 * xScale, y1 * yScale);
    context.lineTo(x2 * xScale, y2 * yScale);
  }
  context.stroke();
}

export default function ReplicateTravellingWaves() {
  const replicates = useMemo(
    () => REPLICATES.map((replicate) => ({
      ...replicate,
      simulation: simulateWaveReplicate(replicate.seed),
    })),
    [],
  );
  const canvasesRef = useRef(new Map<string, HTMLCanvasElement>());
  const offsetRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const previousFrameRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    previousFrameRef.current = null;
    setPlaying(false);
  }, []);

  const seek = useCallback((nextOffset: number) => {
    const bounded = clampOffset(nextOffset);
    offsetRef.current = bounded;
    setOffset(bounded);
  }, []);

  const togglePlayback = useCallback(() => {
    if (playing) {
      stop();
      return;
    }
    if (offsetRef.current >= WINDOW_HOURS) seek(0);
    setPlaying(true);
    const advance = (timestamp: number) => {
      if (previousFrameRef.current === null) previousFrameRef.current = timestamp;
      const elapsed = (timestamp - previousFrameRef.current) / 1_000;
      previousFrameRef.current = timestamp;
      const nextOffset = clampOffset(offsetRef.current + elapsed * HOURS_PER_SECOND);
      seek(nextOffset);
      if (nextOffset >= WINDOW_HOURS) {
        stop();
        return;
      }
      animationRef.current = requestAnimationFrame(advance);
    };
    animationRef.current = requestAnimationFrame(advance);
  }, [playing, seek, stop]);

  useEffect(() => {
    for (const replicate of replicates) {
      for (const startHour of START_HOURS) {
        const canvas = canvasesRef.current.get(`${replicate.id}-${startHour}`);
        if (canvas) drawSnapshot(canvas, snapshotAt(replicate.simulation, startHour + offset));
      }
    }
  }, [offset, replicates]);

  useEffect(() => stop, [stop]);

  return (
    <main className={styles.page}>
      <section className={styles.grid} aria-label="Three mechanistic fungal-network simulations at three separated times">
        {replicates.flatMap((replicate, row) =>
          START_HOURS.map((startHour) => {
            const key = `${replicate.id}-${startHour}`;
            const hour = startHour + offset;
            return (
              <figure className={styles.panel} key={key}>
                <canvas
                  ref={(node) => {
                    if (node) canvasesRef.current.set(key, node);
                    else canvasesRef.current.delete(key);
                  }}
                  aria-label={`Simulated replicate ${row + 1} at ${Math.round(hour)} hours`}
                  className={styles.canvas}
                />
                <span className={styles.scaleBar} aria-label="1 millimetre scale" />
                <output>t = {Math.round(hour)} h</output>
              </figure>
            );
          }),
        )}
      </section>

      <section className={styles.controls} aria-label="Thirty-hour simulation window">
        <button type="button" aria-pressed={playing} onClick={togglePlayback}>
          {playing ? "Pause" : offset >= WINDOW_HOURS ? "Rerun 30 h" : "Run 30 h"}
        </button>
        <input
          aria-label="Hours advanced from the three comparison times"
          max={WINDOW_HOURS}
          min="0"
          step="0.1"
          type="range"
          value={offset}
          onChange={(event) => {
            stop();
            seek(Number(event.target.value));
          }}
        />
        <button type="button" onClick={() => {
          stop();
          seek(0);
        }}>
          0 / 30 / 60 h
        </button>
      </section>
    </main>
  );
}
