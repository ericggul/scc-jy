"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./cellular-automata.module.css";
import {
  countDivergentCells,
  createHexAutomaton,
  paintHexAutomaton,
  stepHexAutomaton,
  type HexAutomaton,
  type PaintState,
  type PaletteMode,
} from "./model";

const STEP_MILLISECONDS = 76;
const TRANSITION_MILLISECONDS = 88;
const MIN_COLUMNS = 50;
const TARGET_RADIUS = 24;
const RB_COLORS = ["#db3030", "#286ac9"] as const;
const RGB_COLORS = ["#db3030", "#25a75b", "#286ac9"] as const;
const RAINBOW_COLORS = ["#db3030", "#e6802d", "#e9d037", "#25a75b", "#286ac9", "#585cc8", "#9d45c6"] as const;

function hexMetrics(width: number) {
  const radius = Math.min(TARGET_RADIUS, width / (MIN_COLUMNS * 1.5 + 0.5));
  return { radius, columns: Math.max(MIN_COLUMNS, Math.floor((width - radius / 2) / (radius * 1.5))) };
}

function centerFor(column: number, row: number, radius: number) {
  const height = Math.sqrt(3) * radius;
  return { x: radius + column * radius * 1.5, y: height / 2 + row * height + (column % 2) * height / 2 };
}

function hexPath(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  for (let corner = 0; corner < 6; corner += 1) {
    const angle = corner * Math.PI / 3;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (corner === 0) context.moveTo(pointX, pointY); else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

function fillShape(context: CanvasRenderingContext2D, layer: number, current: number, previous: number, x: number, y: number, radius: number, transition: number, colors: readonly string[]) {
  const draw = (state: number, alpha: number) => {
    const scale = Math.pow(Math.sqrt(3) / 2, Math.ceil(layer / 2));
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = colors[state]!;
    if (layer % 2 === 0) { hexPath(context, x, y, radius * scale); context.fill(); }
    else { context.beginPath(); context.arc(x, y, radius * scale, 0, Math.PI * 2); context.fill(); }
    context.restore();
  };
  draw(previous, 1);
  if (current !== previous) draw(current, transition);
}

function drawAutomaton(context: CanvasRenderingContext2D, automaton: HexAutomaton, radius: number, transition: number, colors: readonly string[], borders: boolean) {
  context.clearRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
  // Odd columns begin half a hex lower, so the wrapped final row must also be
  // painted at y < 0 to close the top edge of the viewport.
  for (let row = -1; row < automaton.rows; row += 1) {
    for (let column = 0; column < automaton.columns; column += 1) {
      const index = ((row + automaton.rows) % automaton.rows) * automaton.columns + column;
      const { x, y } = centerFor(column, row, radius);
      for (let layer = 0; layer < automaton.layers.length; layer += 1) fillShape(context, layer, automaton.layers[layer]![index]!, automaton.previousLayers[layer]![index]!, x, y, radius, transition, colors);
      if (borders) { context.strokeStyle = "#000"; context.lineWidth = 1; hexPath(context, x, y, radius); context.stroke(); }
    }
  }
}

export default function CellularAutomataSix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const automatonRef = useRef<HexAutomaton | null>(null);
  const radiusRef = useRef(20);
  const pausedRef = useRef(false);
  const stateRef = useRef<PaintState>("red");
  const [paused, setPaused] = useState(false);
  const [paintState, setPaintState] = useState<PaintState>("red");
  const [mode, setMode] = useState<PaletteMode>("rainbow");
  const [depth, setDepth] = useState(13);
  const [borders, setBorders] = useState(false);
  const [readout, setReadout] = useState({ generation: 0, divergent: 0 });
  const colors = mode === "rb" ? RB_COLORS : mode === "rgb" ? RGB_COLORS : RAINBOW_COLORS;
  const states: readonly PaintState[] = mode === "rb" ? ["red", "blue"] : mode === "rgb" ? ["red", "green", "blue"] : ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

  const refreshReadout = useCallback(() => { const automaton = automatonRef.current; if (automaton) setReadout({ generation: automaton.generation, divergent: countDivergentCells(automaton) }); }, []);
  const advance = useCallback(() => { if (automatonRef.current) { automatonRef.current = stepHexAutomaton(automatonRef.current); refreshReadout(); } }, [refreshReadout]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { stateRef.current = paintState; }, [paintState]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)"); let previousStep = performance.now();
    const resize = () => {
      const bounds = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); const { radius, columns } = hexMetrics(bounds.width); const rows = Math.max(1, Math.ceil(bounds.height / (Math.sqrt(3) * radius)) + 1);
      canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0); radiusRef.current = radius;
      if (!automatonRef.current || automatonRef.current.columns !== columns || automatonRef.current.rows !== rows || automatonRef.current.mode !== mode || automatonRef.current.layerCount !== depth) { automatonRef.current = createHexAutomaton(columns, rows, mode, depth); refreshReadout(); }
    };
    const render = (time: number) => { if (automatonRef.current && !pausedRef.current && !reduced.matches && time - previousStep >= STEP_MILLISECONDS) { automatonRef.current = stepHexAutomaton(automatonRef.current); previousStep = time; refreshReadout(); } if (automatonRef.current) drawAutomaton(context, automatonRef.current, radiusRef.current, Math.min(1, (time - previousStep) / TRANSITION_MILLISECONDS), colors, borders); frameRef.current = requestAnimationFrame(render); };
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas); frameRef.current = requestAnimationFrame(render); return () => { observer.disconnect(); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [borders, colors, depth, mode, refreshReadout]);

  const paint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current; const automaton = automatonRef.current; if (!canvas || !automaton) return;
    const bounds = canvas.getBoundingClientRect(); const x = clientX - bounds.left; const y = clientY - bounds.top; const radius = radiusRef.current; const roughColumn = Math.round((x - radius) / (radius * 1.5));
    let closest = { column: 0, row: 0, distance: Infinity };
    for (let column = roughColumn - 2; column <= roughColumn + 2; column += 1) for (let row = 0; row < automaton.rows; row += 1) { const center = centerFor(column, row, radius); const distance = Math.hypot(center.x - x, center.y - y); if (distance < closest.distance) closest = { column, row, distance }; }
    automatonRef.current = paintHexAutomaton(automaton, closest.column, closest.row, stateRef.current); refreshReadout();
  };

  const chooseMode = (nextMode: PaletteMode) => { const automaton = automatonRef.current; setMode(nextMode); setPaintState("red"); if (automaton) { automatonRef.current = createHexAutomaton(automaton.columns, automaton.rows, nextMode, depth); refreshReadout(); } };
  const chooseDepth = (nextDepth: number) => { const automaton = automatonRef.current; setDepth(nextDepth); if (automaton) { automatonRef.current = createHexAutomaton(automaton.columns, automaton.rows, mode, nextDepth); refreshReadout(); } };

  return <main className={styles.page}><canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label={`${depth} independent hexagonal cellular automata.`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); paint(event.clientX, event.clientY); }} onPointerMove={(event) => { if ((event.buttons & 1) !== 0) paint(event.clientX, event.clientY); }} /><header className={styles.header}><p>{mode === "rb" ? `${depth} × hex B3 / S23` : `${depth} × hex cycle`}</p></header><section className={styles.controls} aria-label="Hexagonal cellular automaton controls"><dl><div><dt>generation</dt><dd>{readout.generation}</dd></div><div><dt>divergence</dt><dd>{readout.divergent}</dd></div></dl><div className={styles.actions}><span className={styles.paletteMode}><button type="button" aria-pressed={mode === "rb"} onClick={() => chooseMode("rb")}>r/b</button><button type="button" aria-pressed={mode === "rgb"} onClick={() => chooseMode("rgb")}>r/g/b</button><button type="button" aria-pressed={mode === "rainbow"} onClick={() => chooseMode("rainbow")}>rainbow</button></span><span className={styles.layer}>{[1,5,9,13].map((count) => <button key={count} type="button" aria-pressed={depth === count} onClick={() => chooseDepth(count)}>{count}</button>)}</span><span className={styles.palette}>{states.map((state) => <button key={state} type="button" className={styles[state]} aria-pressed={paintState === state} onClick={() => setPaintState(state)}>{state}</button>)}</span><button type="button" aria-pressed={borders} onClick={() => setBorders((value) => !value)}>border {borders ? "on" : "off"}</button><button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "continue" : "pause"}</button><button type="button" onClick={advance}>step</button></div></section></main>;
}
