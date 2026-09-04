"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cellular-automata.module.css";
import {
  RAINBOW_STATES,
  MUTATION_CHANCE,
  TRANSMISSION_CHANCE,
  countRainbowStates,
  createRainbowAutomaton,
  fillRainbowAutomaton,
  paintRainbowAutomaton,
  stepRainbowAutomaton,
  type RainbowAutomaton,
  type RainbowMode,
  type RainbowState,
  type StateCounts,
} from "./model";

const CELL_SIZE = 7;
const STEP_MILLISECONDS = 76;

const CELL_COLORS = [
  "#e84646",
  "#f2893e",
  "#f3d64c",
  "#45b970",
  "#4187e2",
  "#5e65d6",
  "#a657cc",
] as const;

function drawAutomaton(context: CanvasRenderingContext2D, automaton: RainbowAutomaton) {
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

export default function CellularAutomataThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const automatonRef = useRef<RainbowAutomaton | null>(null);
  const pausedRef = useRef(false);
  const paintStateRef = useRef<RainbowState>("red");
  const modeRef = useRef<RainbowMode>("probabilistic");
  const [paused, setPaused] = useState(false);
  const [paintState, setPaintState] = useState<RainbowState>("red");
  const [mode, setMode] = useState<RainbowMode>("probabilistic");
  const [readout, setReadout] = useState<{ generation: number; counts: StateCounts }>({
    generation: 0,
    counts: {
      red: 0,
      orange: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      indigo: 0,
      violet: 0,
    },
  });

  const refreshReadout = useCallback(() => {
    const automaton = automatonRef.current;
    if (!automaton) return;
    setReadout({ generation: automaton.generation, counts: countRainbowStates(automaton) });
  }, []);

  const step = useCallback(() => {
    if (!automatonRef.current) return;
    automatonRef.current = stepRainbowAutomaton(automatonRef.current, modeRef.current);
    refreshReadout();
  }, [refreshReadout]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    paintStateRef.current = paintState;
  }, [paintState]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
        automatonRef.current = createRainbowAutomaton(columns, rows);
        refreshReadout();
      }
    };

    const render = (time: number) => {
      if (automatonRef.current && !pausedRef.current && !reduceMotion.matches && time - previousStep >= STEP_MILLISECONDS) {
        automatonRef.current = stepRainbowAutomaton(automatonRef.current, modeRef.current);
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
    automatonRef.current = paintRainbowAutomaton(
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
    automatonRef.current = createRainbowAutomaton(automaton.columns, automaton.rows);
    refreshReadout();
  };

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={`Seven-colour rainbow cellular automaton in ${mode} mode. Select a colour, then press and drag to paint its cells.`} tabIndex={0}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); paint(event.clientX, event.clientY); }}
        onPointerMove={(event) => { if ((event.buttons & 1) !== 0) paint(event.clientX, event.clientY); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); paint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); } }}
      />
      <header className={styles.header}>
        <h1>cellular automata</h1>
        <p>{mode === "probabilistic" ? `${Math.round(TRANSMISSION_CHANCE * 100)}% contact / ${Math.round(MUTATION_CHANCE * 1000) / 10}% drift` : "R → O → Y → G → B → I → V"}</p>
      </header>
      <section className={styles.controls} aria-label="Probabilistic cellular automaton controls">
        <dl>
          <div><dt>generation</dt><dd>{readout.generation}</dd></div>
          {RAINBOW_STATES.map((state) => <div key={state}><dt className={styles[state]}>{state}</dt><dd>{readout.counts[state]}</dd></div>)}
        </dl>
        <div className={styles.actions}>
          <span className={styles.modes} aria-label="Transmission mode">
            <button type="button" aria-pressed={mode === "probabilistic"} onClick={() => setMode("probabilistic")}>probability</button>
            <button type="button" aria-pressed={mode === "cycle"} onClick={() => setMode("cycle")}>cycle</button>
          </span>
          <span className={styles.palette} aria-label="Paint color">
            {RAINBOW_STATES.map((state) => <button key={state} type="button" className={styles[state]} aria-pressed={paintState === state} onClick={() => setPaintState(state)}>{state}</button>)}
          </span>
          <button type="button" onClick={() => setPaused((current) => !current)}>{paused ? "continue" : "pause"}</button>
          <button type="button" onClick={step}>step</button>
          <button type="button" onClick={reset}>seed</button>
          <button type="button" onClick={() => { if (!automatonRef.current) return; automatonRef.current = fillRainbowAutomaton(automatonRef.current, "red"); refreshReadout(); }}>red field</button>
        </div>
      </section>
    </main>
  );
}
