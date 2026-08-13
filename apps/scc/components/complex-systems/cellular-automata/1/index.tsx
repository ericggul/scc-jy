"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cellular-automata.module.css";
import {
  clearAutomaton,
  countLivingCells,
  createAutomaton,
  paintAutomaton,
  stepAutomaton,
  type Automaton,
} from "./model";

const CELL_SIZE = 7;
const STEP_MILLISECONDS = 76;

function drawAutomaton(
  context: CanvasRenderingContext2D,
  automaton: Automaton,
) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  for (let row = 0; row < automaton.rows; row += 1) {
    for (let column = 0; column < automaton.columns; column += 1) {
      const index = row * automaton.columns + column;
      const alive = automaton.cells[index] === 1;
      const wasAlive = automaton.previous[index] === 1;
      if (!alive && !wasAlive) continue;
      context.fillStyle = alive
        ? wasAlive ? "rgba(23, 32, 28, 0.88)" : "rgba(70, 105, 111, 0.94)"
        : "rgba(145, 79, 59, 0.26)";
      context.fillRect(
        column * CELL_SIZE + 0.5,
        row * CELL_SIZE + 0.5,
        CELL_SIZE - 1,
        CELL_SIZE - 1,
      );
    }
  }
}

export default function CellularAutomataOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const automatonRef = useRef<Automaton | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState({ generation: 0, living: 0 });

  const refreshReadout = useCallback(() => {
    const automaton = automatonRef.current;
    if (!automaton) return;
    setReadout({
      generation: automaton.generation,
      living: countLivingCells(automaton),
    });
  }, []);

  const step = useCallback(() => {
    if (!automatonRef.current) return;
    automatonRef.current = stepAutomaton(automatonRef.current);
    refreshReadout();
  }, [refreshReadout]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousStep = performance.now();

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const columns = Math.max(1, Math.ceil(bounds.width / CELL_SIZE));
      const rows = Math.max(1, Math.ceil(bounds.height / CELL_SIZE));
      if (
        !automatonRef.current ||
        automatonRef.current.columns !== columns ||
        automatonRef.current.rows !== rows
      ) {
        automatonRef.current = createAutomaton(columns, rows);
        refreshReadout();
      }
    };

    const render = (time: number) => {
      if (
        automatonRef.current &&
        !pausedRef.current &&
        !reduceMotion.matches &&
        time - previousStep >= STEP_MILLISECONDS
      ) {
        automatonRef.current = stepAutomaton(automatonRef.current);
        previousStep = time;
        refreshReadout();
      }
      if (automatonRef.current) drawAutomaton(context, automatonRef.current);
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

  const paint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const automaton = automatonRef.current;
    if (!canvas || !automaton) return;
    const bounds = canvas.getBoundingClientRect();
    automatonRef.current = paintAutomaton(
      automaton,
      Math.floor((clientX - bounds.left) / CELL_SIZE),
      Math.floor((clientY - bounds.top) / CELL_SIZE),
    );
    refreshReadout();
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Conway's Game of Life cellular automaton. Press and drag to paint living cells."
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          paint(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if ((event.buttons & 1) === 0) return;
          paint(event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          paint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }}
      />

      <header className={styles.header}>
        <h1>cellular automata</h1>
        <p>B3 / S23</p>
      </header>

      <section className={styles.controls} aria-label="Cellular automaton controls">
        <dl>
          <div><dt>generation</dt><dd>{readout.generation}</dd></div>
          <div><dt>living cells</dt><dd>{readout.living}</dd></div>
        </dl>
        <div className={styles.actions}>
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={step}>step</button>
          <button
            type="button"
            onClick={() => {
              if (!automatonRef.current) return;
              automatonRef.current = createAutomaton(
                automatonRef.current.columns,
                automatonRef.current.rows,
              );
              refreshReadout();
            }}
          >
            seed
          </button>
          <button
            type="button"
            onClick={() => {
              if (!automatonRef.current) return;
              automatonRef.current = clearAutomaton(automatonRef.current);
              refreshReadout();
            }}
          >
            clear
          </button>
        </div>
      </section>
    </main>
  );
}
