"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./polling-ecology.module.css";
import {
  currentPollPhase,
  currentTopic,
  createOpinionEcosystem,
  seedOpinionPatch,
  stepOpinionEcosystem,
  summarizeOpinionEcosystem,
  TOPICS,
  type Faction,
  type OpinionCell,
  type OpinionEcosystem,
} from "./model";

const STEP_MILLISECONDS = 84;
const INITIAL_SEED = 0x4f5a6d73;

type SeedFaction = Exclude<Faction, "quiet">;

type GridGeometry = {
  cellSize: number;
  left: number;
  top: number;
};

function gridGeometry(
  canvas: HTMLCanvasElement,
  ecosystem: OpinionEcosystem,
): GridGeometry {
  const cellSize = Math.max(
    2,
    Math.floor(
      Math.min(
        canvas.clientWidth / ecosystem.columns,
        canvas.clientHeight / ecosystem.rows,
      ),
    ),
  );
  return {
    cellSize,
    left: (canvas.clientWidth - ecosystem.columns * cellSize) / 2,
    top: (canvas.clientHeight - ecosystem.rows * cellSize) / 2,
  };
}

function paintCell(
  context: CanvasRenderingContext2D,
  cell: OpinionCell,
  previous: OpinionCell,
  x: number,
  y: number,
  size: number,
) {
  if (cell.faction === "quiet") {
    if (previous.faction === "quiet") return;
    context.fillStyle = "rgba(145, 79, 59, 0.18)";
    context.fillRect(x + 1, y + 1, Math.max(1, size - 2), Math.max(1, size - 2));
    return;
  }

  const born = previous.faction === "quiet";
  const alpha = 0.5 + cell.conviction * 0.48;
  const fill = cell.faction === "blue"
    ? `rgba(49, 95, 137, ${Math.min(1, alpha + (born ? 0.12 : 0))})`
    : `rgba(247, 244, 233, ${alpha})`;
  const inset = Math.max(0.5, size * (0.17 - cell.conviction * 0.075));
  const markSize = Math.max(1, size - inset * 2);
  context.fillStyle = fill;
  context.strokeStyle = cell.faction === "blue"
    ? "rgba(20, 48, 75, 0.58)"
    : "rgba(49, 95, 137, 0.82)";
  context.lineWidth = Math.max(0.45, size * 0.055);

  const topic = TOPICS.findIndex((candidate) => candidate.id === cell.topic);
  if (topic === 1) {
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, markSize * 0.43, 0, Math.PI * 2);
    context.fill();
    if (cell.faction === "white") context.stroke();
    return;
  }
  if (topic === 2) {
    context.fillRect(x + inset, y + size * 0.33, markSize, Math.max(1, size * 0.34));
    if (cell.faction === "white") {
      context.beginPath();
      context.moveTo(x + inset, y + size / 2);
      context.lineTo(x + inset + markSize, y + size / 2);
      context.stroke();
    }
    return;
  }
  if (topic === 3) {
    context.beginPath();
    context.moveTo(x + size / 2, y + inset);
    context.lineTo(x + size - inset, y + size - inset);
    context.lineTo(x + inset, y + size - inset);
    context.closePath();
    context.fill();
    if (cell.faction === "white") context.stroke();
    return;
  }
  context.fillRect(x + inset, y + inset, markSize, markSize);
  if (cell.faction === "white") {
    context.strokeRect(x + inset, y + inset, markSize, markSize);
  }
}

function drawEcosystem(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  ecosystem: OpinionEcosystem,
) {
  const geometry = gridGeometry(canvas, ecosystem);
  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ecosystem.cells.forEach((cell, index) => {
    const column = index % ecosystem.columns;
    const row = Math.floor(index / ecosystem.columns);
    paintCell(
      context,
      cell,
      ecosystem.previousCells[index] ?? cell,
      geometry.left + column * geometry.cellSize,
      geometry.top + row * geometry.cellSize,
      geometry.cellSize,
    );
  });
}

function initialReadout() {
  const ecosystem = createOpinionEcosystem(60, 42, INITIAL_SEED);
  return {
    poll: summarizeOpinionEcosystem(ecosystem),
    generation: ecosystem.generation,
  };
}

export default function PollingEcology() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ecosystemRef = useRef<OpinionEcosystem | null>(null);
  const frameRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const seedFactionRef = useRef<SeedFaction>("blue");
  const [paused, setPaused] = useState(false);
  const [seedFaction, setSeedFaction] = useState<SeedFaction>("blue");
  const [readout, setReadout] = useState(initialReadout);

  const refreshReadout = useCallback(() => {
    const ecosystem = ecosystemRef.current;
    if (!ecosystem) return;
    setReadout({
      poll: summarizeOpinionEcosystem(ecosystem),
      generation: ecosystem.generation,
    });
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    seedFactionRef.current = seedFaction;
  }, [seedFaction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousStep = performance.now();
    let previousReadout = previousStep;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!ecosystemRef.current) {
        ecosystemRef.current = createOpinionEcosystem(
          Math.min(78, Math.max(32, Math.round(bounds.width / 13))),
          Math.min(54, Math.max(30, Math.round(bounds.height / 13))),
          INITIAL_SEED,
        );
        refreshReadout();
      }
    };

    const render = (time: number) => {
      if (
        ecosystemRef.current &&
        !pausedRef.current &&
        !reduceMotion.matches &&
        time - previousStep >= STEP_MILLISECONDS
      ) {
        ecosystemRef.current = stepOpinionEcosystem(ecosystemRef.current);
        previousStep = time;
      }
      if (ecosystemRef.current) {
        drawEcosystem(context, canvas, ecosystemRef.current);
        if (time - previousReadout >= 280) {
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

  const plantSeed = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ecosystem = ecosystemRef.current;
    if (!canvas || !ecosystem) return;
    const bounds = canvas.getBoundingClientRect();
    const geometry = gridGeometry(canvas, ecosystem);
    const column = Math.floor((clientX - bounds.left - geometry.left) / geometry.cellSize);
    const row = Math.floor((clientY - bounds.top - geometry.top) / geometry.cellSize);
    ecosystemRef.current = seedOpinionPatch(
      ecosystem,
      Math.min(ecosystem.columns - 1, Math.max(0, column)),
      Math.min(ecosystem.rows - 1, Math.max(0, row)),
      seedFactionRef.current,
    );
    refreshReadout();
  }, [refreshReadout]);

  const topic = currentTopic(readout.generation);
  const phase = currentPollPhase(readout.generation);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Synthetic polling ecology. Press or drag to plant the selected blue or white opinion patch into the cellular field."
        role="application"
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          plantSeed(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) === 0) return;
          plantSeed(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          plantSeed(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }}
      />

      <header className={styles.header}>
        <h1>polling ecology</h1>
        <p>synthetic stance field / {topic.label} / {phase}</p>
      </header>

      <section className={styles.controls} aria-label="Polling ecology controls">
        <dl>
          <div><dt>blue</dt><dd>{readout.poll.blue}</dd></div>
          <div><dt>white</dt><dd>{readout.poll.white}</dd></div>
          <div><dt>cycle</dt><dd>{Math.floor(readout.generation / 180) + 1}</dd></div>
          <div><dt>issue</dt><dd>{topic.label}</dd></div>
        </dl>
        <div className={styles.actions}>
          <button
            type="button"
            aria-pressed={seedFaction === "blue"}
            onClick={() => setSeedFaction("blue")}
          >
            seed blue
          </button>
          <button
            type="button"
            aria-pressed={seedFaction === "white"}
            onClick={() => setSeedFaction("white")}
          >
            seed white
          </button>
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button
            type="button"
            onClick={() => {
              const ecosystem = ecosystemRef.current;
              if (!ecosystem) return;
              ecosystemRef.current = createOpinionEcosystem(
                ecosystem.columns,
                ecosystem.rows,
                INITIAL_SEED,
              );
              refreshReadout();
            }}
          >
            reset
          </button>
        </div>
      </section>
    </main>
  );
}
