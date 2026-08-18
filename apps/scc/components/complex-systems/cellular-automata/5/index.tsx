"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cellular-automata.module.css";
import {
  countDivergentCells,
  createNestedAutomaton,
  paintNestedAutomaton,
  stepNestedAutomaton,
  type NestedAutomaton,
  type PaletteMode,
  type PaintState,
} from "./model";

const STEP_MILLISECONDS = 76;
const TRANSITION_MILLISECONDS = 88;
const MIN_COLUMNS = 50;
const TARGET_CELL_WIDTH = 48;
const RB_COLORS = ["#db3030", "#286ac9"] as const;
const RGB_COLORS = ["#db3030", "#25a75b", "#286ac9"] as const;
const RAINBOW_COLORS = ["#db3030", "#e6802d", "#e9d037", "#25a75b", "#286ac9", "#585cc8", "#9d45c6"] as const;
const TAEGEUK_COLORS = ["#ffffff", "#000000", "#cd2e3a", "#0f64cd"] as const;

function gridFor(width: number) {
  const columns = Math.max(MIN_COLUMNS, Math.round(width / TARGET_CELL_WIDTH));
  return { columns, cellSize: width / columns };
}

function fillShape(
  context: CanvasRenderingContext2D,
  layer: number,
  state: number,
  previousState: number,
  x: number,
  y: number,
  cellSize: number,
  transition: number,
  colors: readonly string[],
) {
  const draw = (colour: number, alpha: number) => {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = colors[colour]!;
    const centerX = x + cellSize / 2;
    const centerY = y + cellSize / 2;
    const scale = Math.pow(Math.SQRT2, -Math.floor(layer / 2));
    if (layer % 2 === 0) {
      const side = cellSize * scale;
      context.translate(centerX, centerY);
      context.rotate(layer % 4 === 2 ? Math.PI / 4 : Math.PI / 2);
      context.fillRect(-side / 2, -side / 2, side, side);
    } else {
      context.beginPath();
      context.arc(centerX, centerY, cellSize * scale / 2, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };
  draw(previousState, 1);
  if (state !== previousState) draw(state, transition);
}

function drawAutomaton(
  context: CanvasRenderingContext2D,
  automaton: NestedAutomaton,
  cellSize: number,
  transition: number,
  colors: readonly string[],
  borders: boolean,
) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  for (let row = 0; row < automaton.rows; row += 1) {
    for (let column = 0; column < automaton.columns; column += 1) {
      const index = row * automaton.columns + column;
      const x = column * cellSize;
      const y = row * cellSize;
      for (let layer = 0; layer < automaton.layers.length; layer += 1) {
        fillShape(context, layer, automaton.layers[layer]![index]!, automaton.previousLayers[layer]![index]!, x, y, cellSize, transition, colors);
      }
      if (borders) {
        context.strokeStyle = "#000";
        context.lineWidth = 1;
        context.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }
}

export default function CellularAutomataFive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const automatonRef = useRef<NestedAutomaton | null>(null);
  const cellSizeRef = useRef(120);
  const pausedRef = useRef(false);
  const stateRef = useRef<PaintState>("red");
  const [paused, setPaused] = useState(false);
  const [paintState, setPaintState] = useState<PaintState>("red");
  const [mode, setMode] = useState<PaletteMode>("rgb");
  const [depth, setDepth] = useState(9);
  const [borders, setBorders] = useState(false);
  const [readout, setReadout] = useState({ generation: 0, divergent: 0 });
  const colors = mode === "rb" ? RB_COLORS : mode === "rgb" ? RGB_COLORS : mode === "taegeuk" ? TAEGEUK_COLORS : RAINBOW_COLORS;
  const states: readonly PaintState[] = mode === "rb" ? ["red", "blue"] : mode === "rgb" ? ["red", "green", "blue"] : mode === "taegeuk" ? ["white", "black", "red", "blue"] : ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

  const refreshReadout = useCallback(() => {
    const automaton = automatonRef.current;
    if (!automaton) return;
    setReadout({ generation: automaton.generation, divergent: countDivergentCells(automaton) });
  }, []);

  const advance = useCallback(() => {
    if (!automatonRef.current) return;
    automatonRef.current = stepNestedAutomaton(automatonRef.current);
    refreshReadout();
  }, [refreshReadout]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { stateRef.current = paintState; }, [paintState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousStep = performance.now();
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { columns, cellSize } = gridFor(bounds.width);
      const rows = Math.max(1, Math.ceil(bounds.height / cellSize));
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      cellSizeRef.current = cellSize;
      if (!automatonRef.current || automatonRef.current.columns !== columns || automatonRef.current.rows !== rows || automatonRef.current.mode !== mode || automatonRef.current.layerCount !== depth) {
        automatonRef.current = createNestedAutomaton(columns, rows, mode, depth);
        refreshReadout();
      }
    };
    const render = (time: number) => {
      if (automatonRef.current && !pausedRef.current && !reduceMotion.matches && time - previousStep >= STEP_MILLISECONDS) {
        automatonRef.current = stepNestedAutomaton(automatonRef.current);
        previousStep = time;
        refreshReadout();
      }
      if (automatonRef.current) drawAutomaton(context, automatonRef.current, cellSizeRef.current, Math.min(1, (time - previousStep) / TRANSITION_MILLISECONDS), colors, borders);
      frameRef.current = requestAnimationFrame(render);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => { observer.disconnect(); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [borders, colors, depth, mode, refreshReadout]);

  const paint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const automaton = automatonRef.current;
    if (!canvas || !automaton) return;
    const bounds = canvas.getBoundingClientRect();
    automatonRef.current = paintNestedAutomaton(automaton, Math.floor((clientX - bounds.left) / cellSizeRef.current), Math.floor((clientY - bounds.top) / cellSizeRef.current), stateRef.current);
    refreshReadout();
  };

  const chooseMode = (nextMode: PaletteMode) => {
    const automaton = automatonRef.current;
    setMode(nextMode);
    setPaintState("red");
    if (!automaton) return;
    automatonRef.current = createNestedAutomaton(automaton.columns, automaton.rows, nextMode, depth);
    refreshReadout();
  };

  const chooseDepth = (nextDepth: number) => {
    const automaton = automatonRef.current;
    setDepth(nextDepth);
    if (!automaton) return;
    automatonRef.current = createNestedAutomaton(automaton.columns, automaton.rows, mode, nextDepth);
    refreshReadout();
  };

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label={`${depth} independent ${mode === "rb" ? "B3/S23" : "cyclic"} automata rendered as nested squares and circles.`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); paint(event.clientX, event.clientY); }}
        onPointerMove={(event) => { if ((event.buttons & 1) !== 0) paint(event.clientX, event.clientY); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); paint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); } }}
      />
      <header className={styles.header}><p>{mode === "rb" ? `${depth} × B3 / S23` : mode === "rgb" ? `${depth} × R → G → B` : mode === "taegeuk" ? `${depth} × taegeuk cycle` : `${depth} × rainbow cycle`}</p></header>
      <section className={styles.controls} aria-label="Nested cellular automaton controls">
        <dl><div><dt>generation</dt><dd>{readout.generation}</dd></div><div><dt>divergence</dt><dd>{readout.divergent}</dd></div></dl>
        <div className={styles.actions}>
          <span className={styles.paletteMode} aria-label="Palette"><button type="button" aria-pressed={mode === "rb"} onClick={() => chooseMode("rb")}>r/b</button><button type="button" aria-pressed={mode === "rgb"} onClick={() => chooseMode("rgb")}>r/g/b</button><button type="button" aria-pressed={mode === "rainbow"} onClick={() => chooseMode("rainbow")}>rainbow</button><button type="button" aria-pressed={mode === "taegeuk"} onClick={() => chooseMode("taegeuk")}>taegeuk</button></span>
          <span className={styles.layer} aria-label="Nested depth">{[1, 5, 9].map((count) => <button key={count} type="button" aria-pressed={depth === count} onClick={() => chooseDepth(count)}>{count}</button>)}</span>
          <span className={styles.palette} aria-label="State to paint">{states.map((state) => <button key={state} type="button" className={styles[state]} aria-pressed={paintState === state} onClick={() => setPaintState(state)}>{state}</button>)}</span>
          <button type="button" aria-pressed={borders} onClick={() => setBorders((value) => !value)}>border {borders ? "on" : "off"}</button>
          <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "continue" : "pause"}</button><button type="button" onClick={advance}>step</button>
        </div>
      </section>
    </main>
  );
}
