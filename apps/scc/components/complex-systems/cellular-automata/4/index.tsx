"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cellular-automata.module.css";
import {
  RGB_STATES,
  RB_STATES,
  RAINBOW_STATES,
  countMismatch,
  createDoubleAutomaton,
  paintDoubleAutomaton,
  stepDoubleAutomaton,
  type DoubleAutomaton,
  type PaintLayer,
  type ColourState,
  type PaletteMode,
} from "./model";

const RGB_STEP_MILLISECONDS = 110;
const RAINBOW_STEP_MILLISECONDS = 48;
const RGB_TRANSITION_MILLISECONDS = 128;
const RAINBOW_TRANSITION_MILLISECONDS = 56;
const RGB_FIELD_COLORS = ["#db3030", "#25a75b", "#286ac9"] as const;
const RB_FIELD_COLORS = ["#db3030", "#286ac9"] as const;
const RAINBOW_FIELD_COLORS = ["#db3030", "#e6802d", "#e9d037", "#25a75b", "#286ac9", "#585cc8", "#9d45c6"] as const;
const RGB_TEXT_COLORS = ["#ff5c57", "#55d27a", "#5b9cff"] as const;
const RB_TEXT_COLORS = ["#ff5c57", "#5b9cff"] as const;
const RAINBOW_TEXT_COLORS = ["#ff5c57", "#ffad62", "#ffe573", "#55d27a", "#5b9cff", "#999eff", "#dc86ff"] as const;
const RGB_LABELS = ["R", "G", "B"] as const;
const RB_LABELS = ["R", "B"] as const;
const RAINBOW_LABELS = ["R", "O", "Y", "G", "B", "I", "V"] as const;
const MIN_COLUMNS = 50;
const TARGET_CELL_WIDTH = 48;
const TEXT_SCALE = 0.42;

function gridFor(width: number) {
  const columns = Math.max(MIN_COLUMNS, Math.round(width / TARGET_CELL_WIDTH));
  return { columns, cellSize: width / columns };
}

function drawAutomaton(
  context: CanvasRenderingContext2D,
  automaton: DoubleAutomaton,
  cellSize: number,
  transition: number,
  fieldColors: readonly string[],
  textColors: readonly string[],
  labels: readonly string[],
) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(7, Math.round(cellSize * TEXT_SCALE))}px Futura, "Futura PT", "Century Gothic", Arial, sans-serif`;
  for (let row = 0; row < automaton.rows; row += 1) {
    for (let column = 0; column < automaton.columns; column += 1) {
      const index = row * automaton.columns + column;
      const x = column * cellSize;
      const y = row * cellSize;
      context.fillStyle = fieldColors[automaton.previousField[index]!]!;
      context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      if (automaton.field[index] !== automaton.previousField[index]) {
        context.globalAlpha = transition;
        context.fillStyle = fieldColors[automaton.field[index]!]!;
        context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        context.globalAlpha = 1;
      }
      const midpoint = y + cellSize / 2 + cellSize * 0.02;
      const previousWord = labels[automaton.previousWords[index]!]!;
      const word = labels[automaton.words[index]!]!;
      if (word !== previousWord) {
        context.globalAlpha = 1 - transition;
        context.fillStyle = textColors[automaton.previousWords[index]!]!;
        context.fillText(previousWord, x + cellSize / 2, midpoint - transition * cellSize * 0.1);
        context.globalAlpha = transition;
        context.fillStyle = textColors[automaton.words[index]!]!;
        context.fillText(word, x + cellSize / 2, midpoint + (1 - transition) * cellSize * 0.1);
        context.globalAlpha = 1;
      } else {
        context.fillStyle = textColors[automaton.words[index]!]!;
        context.fillText(word, x + cellSize / 2, midpoint);
      }
    }
  }
}

export default function CellularAutomataFour() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const automatonRef = useRef<DoubleAutomaton | null>(null);
  const cellSizeRef = useRef(120);
  const pausedRef = useRef(false);
  const paintLayerRef = useRef<PaintLayer>("field");
  const paintStateRef = useRef<ColourState>("red");
  const [paused, setPaused] = useState(false);
  const [paintLayer, setPaintLayer] = useState<PaintLayer>("field");
  const [paintState, setPaintState] = useState<ColourState>("red");
  const [palette, setPalette] = useState<PaletteMode>("rgb");
  const [readout, setReadout] = useState({ generation: 0, mismatch: 0 });
  const states = palette === "rgb" ? RGB_STATES : palette === "rb" ? RB_STATES : RAINBOW_STATES;
  const fieldColors = palette === "rgb" ? RGB_FIELD_COLORS : palette === "rb" ? RB_FIELD_COLORS : RAINBOW_FIELD_COLORS;
  const textColors = palette === "rgb" ? RGB_TEXT_COLORS : palette === "rb" ? RB_TEXT_COLORS : RAINBOW_TEXT_COLORS;
  const labels = palette === "rgb" ? RGB_LABELS : palette === "rb" ? RB_LABELS : RAINBOW_LABELS;
  const stepMilliseconds = palette === "rgb" ? RGB_STEP_MILLISECONDS : RAINBOW_STEP_MILLISECONDS;
  const transitionMilliseconds = palette === "rgb"
    ? RGB_TRANSITION_MILLISECONDS
    : RAINBOW_TRANSITION_MILLISECONDS;

  const refreshReadout = useCallback(() => {
    const automaton = automatonRef.current;
    if (!automaton) return;
    setReadout({ generation: automaton.generation, mismatch: countMismatch(automaton) });
  }, []);

  const advance = useCallback(() => {
    if (!automatonRef.current) return;
    automatonRef.current = stepDoubleAutomaton(automatonRef.current);
    refreshReadout();
  }, [refreshReadout]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { paintLayerRef.current = paintLayer; }, [paintLayer]);
  useEffect(() => { paintStateRef.current = paintState; }, [paintState]);

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
      if (!automatonRef.current || automatonRef.current.columns !== columns || automatonRef.current.rows !== rows) {
        automatonRef.current = createDoubleAutomaton(columns, rows, states.length);
        refreshReadout();
      }
    };
    const render = (time: number) => {
      if (automatonRef.current && !pausedRef.current && !reduceMotion.matches && time - previousStep >= stepMilliseconds) {
        automatonRef.current = stepDoubleAutomaton(automatonRef.current);
        previousStep = time;
        refreshReadout();
      }
      if (automatonRef.current) {
        drawAutomaton(
          context,
          automatonRef.current,
          cellSizeRef.current,
          Math.min(1, (time - previousStep) / transitionMilliseconds),
          fieldColors,
          textColors,
          labels,
        );
      }
      frameRef.current = requestAnimationFrame(render);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => { observer.disconnect(); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [fieldColors, labels, palette, refreshReadout, states.length, stepMilliseconds, textColors, transitionMilliseconds]);

  const paint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const automaton = automatonRef.current;
    if (!canvas || !automaton) return;
    const bounds = canvas.getBoundingClientRect();
    automatonRef.current = paintDoubleAutomaton(
      automaton,
      Math.floor((clientX - bounds.left) / cellSizeRef.current),
      Math.floor((clientY - bounds.top) / cellSizeRef.current),
      paintLayerRef.current,
      RAINBOW_STATES.indexOf(paintStateRef.current),
    );
    refreshReadout();
  };

  const choosePalette = (nextPalette: PaletteMode) => {
    const automaton = automatonRef.current;
    setPalette(nextPalette);
    setPaintState("red");
    if (!automaton) return;
    automatonRef.current = createDoubleAutomaton(
      automaton.columns,
      automaton.rows,
      nextPalette === "rgb" ? RGB_STATES.length : nextPalette === "rb" ? RB_STATES.length : RAINBOW_STATES.length,
    );
    refreshReadout();
  };

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label={`Two independent ${palette === "rb" ? "B3/S23" : "cyclic"} cellular automata: colour fields and colour letters. Select the layer and colour to paint.`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); paint(event.clientX, event.clientY); }}
        onPointerMove={(event) => { if ((event.buttons & 1) !== 0) paint(event.clientX, event.clientY); }}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect(); paint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2); } }}
      />
      <header className={styles.header}><p>{palette === "rgb" ? "R → G → B / R → B → G" : palette === "rb" ? "B3 / S23" : "R → O → Y → G → B → I → V / reverse"}</p></header>
      <section className={styles.controls} aria-label="Double cellular automaton controls">
        <dl><div><dt>generation</dt><dd>{readout.generation}</dd></div><div><dt>mismatch</dt><dd>{readout.mismatch}</dd></div></dl>
        <div className={styles.actions}>
          <span className={styles.paletteMode} aria-label="Palette">
            <button type="button" aria-pressed={palette === "rgb"} onClick={() => choosePalette("rgb")}>rgb</button>
            <button type="button" aria-pressed={palette === "rb"} onClick={() => choosePalette("rb")}>r/b</button>
            <button type="button" aria-pressed={palette === "rainbow"} onClick={() => choosePalette("rainbow")}>rainbow</button>
          </span>
          <span className={styles.layer} aria-label="Layer to paint">
            <button type="button" aria-pressed={paintLayer === "field"} onClick={() => setPaintLayer("field")}>field</button>
            <button type="button" aria-pressed={paintLayer === "word"} onClick={() => setPaintLayer("word")}>word</button>
          </span>
          <span className={styles.palette} aria-label="State to paint">
            {states.map((state) => <button key={state} type="button" className={styles[state]} aria-pressed={paintState === state} onClick={() => setPaintState(state)}>{state}</button>)}
          </span>
          <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "continue" : "pause"}</button>
          <button type="button" onClick={advance}>step</button>
        </div>
      </section>
    </main>
  );
}
