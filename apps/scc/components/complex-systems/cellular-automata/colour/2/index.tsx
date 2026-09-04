"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cellular-automata.module.css";
import {
  CYCLIC_STATES,
  SUCCESSOR_THRESHOLD,
  countCyclicStates,
  createCyclicAutomaton,
  fillCyclicAutomaton,
  paintCyclicAutomaton,
  stepCyclicAutomaton,
  type CyclicAutomaton,
  type CyclicState,
  type StateCounts,
} from "./model";

const CELL_SIZE = 7;
const STEP_MILLISECONDS = 76;

const CELL_COLORS = ["#d94646", "#35a765", "#3578d4"] as const;

function drawAutomaton(context: CanvasRenderingContext2D, automaton: CyclicAutomaton) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  for (let row = 0; row < automaton.rows; row += 1) {
    for (let column = 0; column < automaton.columns; column += 1) {
      const index = row * automaton.columns + column;
      context.fillStyle = CELL_COLORS[automaton.cells[index]!];
      context.fillRect(
        column * CELL_SIZE + 0.5,
        row * CELL_SIZE + 0.5,
        CELL_SIZE - 1,
        CELL_SIZE - 1,
      );
    }
  }
}

export default function CellularAutomataTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const automatonRef = useRef<CyclicAutomaton | null>(null);
  const pausedRef = useRef(false);
  const paintStateRef = useRef<CyclicState>("red");
  const [paused, setPaused] = useState(false);
  const [paintState, setPaintState] = useState<CyclicState>("red");
  const [readout, setReadout] = useState<{ generation: number; counts: StateCounts }>({
    generation: 0,
    counts: { red: 0, green: 0, blue: 0 },
  });

  const refreshReadout = useCallback(() => {
    const automaton = automatonRef.current;
    if (!automaton) return;
    setReadout({ generation: automaton.generation, counts: countCyclicStates(automaton) });
  }, []);

  const step = useCallback(() => {
    if (!automatonRef.current) return;
    automatonRef.current = stepCyclicAutomaton(automatonRef.current);
    refreshReadout();
  }, [refreshReadout]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    paintStateRef.current = paintState;
  }, [paintState]);

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
      if (!automatonRef.current || automatonRef.current.columns !== columns || automatonRef.current.rows !== rows) {
        automatonRef.current = createCyclicAutomaton(columns, rows);
        refreshReadout();
      }
    };

    const render = (time: number) => {
      if (automatonRef.current && !pausedRef.current && !reduceMotion.matches && time - previousStep >= STEP_MILLISECONDS) {
        automatonRef.current = stepCyclicAutomaton(automatonRef.current);
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
    automatonRef.current = paintCyclicAutomaton(
      automaton,
      Math.floor((clientX - bounds.left) / CELL_SIZE),
      Math.floor((clientY - bounds.top) / CELL_SIZE),
      paintStateRef.current,
    );
    refreshReadout();
  };

  const reset = () => {
    const automaton = automatonRef.current;
    if (!automaton) return;
    automatonRef.current = createCyclicAutomaton(automaton.columns, automaton.rows);
    refreshReadout();
  };

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Three-state cyclic cellular automaton. Select a color, then press and drag to paint its cells." tabIndex={0}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); paint(event.clientX, event.clientY); }}
        onPointerMove={(event) => { if ((event.buttons & 1) !== 0) paint(event.clientX, event.clientY); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); paint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); } }}
      />
      <header className={styles.header}>
        <h1>cellular automata</h1>
        <p>R → G → B / {SUCCESSOR_THRESHOLD}+ neighbours</p>
      </header>
      <section className={styles.controls} aria-label="Cyclic cellular automaton controls">
        <dl>
          <div><dt>generation</dt><dd>{readout.generation}</dd></div>
          {CYCLIC_STATES.map((state) => <div key={state}><dt className={styles[state]}>{state}</dt><dd>{readout.counts[state]}</dd></div>)}
        </dl>
        <div className={styles.actions}>
          <span className={styles.palette} aria-label="Paint color">
            {CYCLIC_STATES.map((state) => <button key={state} type="button" className={styles[state]} aria-pressed={paintState === state} onClick={() => setPaintState(state)}>{state}</button>)}
          </span>
          <button type="button" onClick={() => setPaused((current) => !current)}>{paused ? "continue" : "pause"}</button>
          <button type="button" onClick={step}>step</button>
          <button type="button" onClick={reset}>seed</button>
          <button type="button" onClick={() => { if (!automatonRef.current) return; automatonRef.current = fillCyclicAutomaton(automatonRef.current, "red"); refreshReadout(); }}>red field</button>
        </div>
      </section>
    </main>
  );
}
