"use client";

import { useEffect, useRef } from "react";
import styles from "./grid-network.module.css";
import {
  createGridNetworkAutomaton,
  setGridNetworkBackgroundState,
  stepGridNetworkBackground,
  stepGridNetworkBorder,
  type GridNetworkAutomaton,
  type GridNetworkCell,
  type GridNetworkCellState,
  type GridNetworkEdge,
} from "./model";

const BACKGROUND_STEP_MILLISECONDS = 76;
const BORDER_STEP_MILLISECONDS = 113;
const BACKGROUND_COLOURS = ["#d94646", "#35a765", "#3578d4"] as const;
const EDGE_COLOUR = "#20201c";
const QUIET_EDGE_COLOUR = "rgba(32, 32, 28, 0.5)";

type CanvasGeometry = Readonly<{
  width: number;
  height: number;
  columns: number;
  rows: number;
  gap: number;
  inset: number;
  columnWidth: number;
  rowHeight: number;
  columnPitch: number;
  rowPitch: number;
}>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function canvasGeometry(
  width: number,
  height: number,
  columns: number,
  rows: number,
): CanvasGeometry {
  const smallestViewportEdge = Math.min(width, height);
  const gap = clamp(smallestViewportEdge * 0.0013, 1, 2);
  const inset = clamp(smallestViewportEdge * 0.004375, 2, 6.4);
  const columnWidth = (width - gap * (columns - 1)) / columns;
  const rowHeight = (height - gap * (rows - 1)) / rows;

  return {
    width,
    height,
    columns,
    rows,
    gap,
    inset,
    columnWidth,
    rowHeight,
    columnPitch: columnWidth + gap,
    rowPitch: rowHeight + gap,
  };
}

function cellBox(cell: GridNetworkCell, geometry: CanvasGeometry) {
  const x = cell.column * geometry.columnPitch + geometry.inset;
  const y = cell.row * geometry.rowPitch + geometry.inset;
  return {
    x,
    y,
    width: Math.max(0, geometry.columnWidth - geometry.inset * 2),
    height: Math.max(0, geometry.rowHeight - geometry.inset * 2),
  };
}

function cellAtPoint(
  x: number,
  y: number,
  geometry: CanvasGeometry,
  automaton: GridNetworkAutomaton,
) {
  const column = Math.floor(x / geometry.columnPitch);
  const row = Math.floor(y / geometry.rowPitch);
  if (column < 0 || column >= geometry.columns || row < 0 || row >= geometry.rows) {
    return null;
  }

  const cell = automaton.network.cells[row * geometry.columns + column]!;
  const box = cellBox(cell, geometry);
  if (x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height) {
    return null;
  }

  return cell;
}

function drawNetwork(
  context: CanvasRenderingContext2D,
  automaton: GridNetworkAutomaton,
  geometry: CanvasGeometry,
) {
  context.clearRect(0, 0, geometry.width, geometry.height);
  const borderWidth = Math.min(2, Math.max(1, geometry.gap));
  const edgeWidth = borderWidth * 2;
  const boxes = automaton.network.cells.map((cell) => cellBox(cell, geometry));

  for (const cell of automaton.network.cells) {
    const box = boxes[cell.index]!;
    context.fillStyle = BACKGROUND_COLOURS[automaton.backgroundStates[cell.index]!]!;
    context.fillRect(box.x, box.y, box.width, box.height);
    context.strokeStyle = BACKGROUND_COLOURS[automaton.borderStates[cell.index]!]!;
    context.lineWidth = borderWidth;
    context.strokeRect(
      box.x + borderWidth / 2,
      box.y + borderWidth / 2,
      Math.max(0, box.width - borderWidth),
      Math.max(0, box.height - borderWidth),
    );
  }

  for (const active of [false, true]) {
    context.beginPath();

    for (const edge of automaton.network.edges) {
      const isDiagonal = edge.from.column !== edge.to.column
        && edge.from.row !== edge.to.row;
      const states = isDiagonal ? automaton.borderStates : automaton.backgroundStates;
      const influencedEdgeIds = isDiagonal
        ? automaton.borderInfluencedEdgeIds
        : automaton.backgroundInfluencedEdgeIds;
      if (
        states[edge.from.index] === states[edge.to.index]
        || influencedEdgeIds.has(edge.id) !== active
      ) continue;

      const fromBox = boxes[edge.from.index]!;
      const toBox = boxes[edge.to.index]!;
      appendEdgePath(context, edge, fromBox, toBox);
    }

    context.lineWidth = edgeWidth;
    context.strokeStyle = active ? EDGE_COLOUR : QUIET_EDGE_COLOUR;
    context.stroke();
  }
}

function appendEdgePath(
  context: CanvasRenderingContext2D,
  edge: GridNetworkEdge,
  fromBox: ReturnType<typeof cellBox>,
  toBox: ReturnType<typeof cellBox>,
) {
  if (edge.from.row === edge.to.row) {
    context.moveTo(fromBox.x + fromBox.width, fromBox.y + fromBox.height / 2);
    context.lineTo(toBox.x, toBox.y + toBox.height / 2);
    return;
  }

  if (edge.from.column === edge.to.column) {
    context.moveTo(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height);
    context.lineTo(toBox.x + toBox.width / 2, toBox.y);
    return;
  }

  if (edge.to.row > edge.from.row) {
    context.moveTo(fromBox.x + fromBox.width, fromBox.y + fromBox.height);
    context.lineTo(toBox.x, toBox.y);
    return;
  }

  context.moveTo(fromBox.x + fromBox.width, fromBox.y);
  context.lineTo(toBox.x, toBox.y + toBox.height);
}

function nextState(state: GridNetworkCellState): GridNetworkCellState {
  return ((state + 1) % 3) as GridNetworkCellState;
}

export default function GridNetworkTwo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const automatonRef = useRef<GridNetworkAutomaton | null>(null);
  const geometryRef = useRef<CanvasGeometry | null>(null);
  const drawRef = useRef<(() => void) | null>(null);
  const paintStateRef = useRef<GridNetworkCellState | null>(null);
  const focusedCellRef = useRef<GridNetworkCell | null>(null);
  if (automatonRef.current === null) {
    automatonRef.current = createGridNetworkAutomaton();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const automaton = automatonRef.current;
    if (!canvas || !automaton) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame: number | null = null;
    let active = true;
    let nextBackgroundStep = performance.now() + BACKGROUND_STEP_MILLISECONDS;
    let nextBorderStep = performance.now() + BORDER_STEP_MILLISECONDS;

    const draw = () => {
      const current = automatonRef.current;
      if (!current || !geometryRef.current) return;
      drawNetwork(context, current, geometryRef.current);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const current = automatonRef.current;
      if (!current) return;
      geometryRef.current = canvasGeometry(
        bounds.width,
        bounds.height,
        current.network.columns,
        current.network.rows,
      );
      draw();
    };

    const resetClock = () => {
      const now = performance.now();
      nextBackgroundStep = now + BACKGROUND_STEP_MILLISECONDS;
      nextBorderStep = now + BORDER_STEP_MILLISECONDS;
    };

    const frame = (time: number) => {
      if (
        active
        && !reducedMotion.matches
        && document.visibilityState === "visible"
      ) {
        let changed = false;
        while (time >= nextBackgroundStep) {
          automatonRef.current = stepGridNetworkBackground(automatonRef.current!);
          nextBackgroundStep += BACKGROUND_STEP_MILLISECONDS;
          changed = true;
        }
        while (time >= nextBorderStep) {
          automatonRef.current = stepGridNetworkBorder(automatonRef.current!);
          nextBorderStep += BORDER_STEP_MILLISECONDS;
          changed = true;
        }
        if (changed) draw();
      }
      animationFrame = window.requestAnimationFrame(frame);
    };

    const onVisibilityChange = () => {
      resetClock();
      if (document.visibilityState === "visible") draw();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    drawRef.current = draw;
    animationFrame = window.requestAnimationFrame(frame);
    reducedMotion.addEventListener("change", resetClock);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      drawRef.current = null;
      reducedMotion.removeEventListener("change", resetClock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const paintAt = (clientX: number, clientY: number, state: GridNetworkCellState) => {
    const canvas = canvasRef.current;
    const automaton = automatonRef.current;
    const geometry = geometryRef.current;
    if (!canvas || !automaton || !geometry) return;
    const bounds = canvas.getBoundingClientRect();
    const cell = cellAtPoint(clientX - bounds.left, clientY - bounds.top, geometry, automaton);
    if (!cell) return;

    focusedCellRef.current = cell;
    automatonRef.current = setGridNetworkBackgroundState(
      automaton,
      cell.column,
      cell.row,
      state,
    );
    drawRef.current?.();
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A 48 by 48 red, green, and blue cellular automaton. Backgrounds change from cardinal neighbours and inset borders change from diagonal neighbours. Press or drag across cells to advance the background colour."
        tabIndex={0}
        onPointerCancel={() => {
          paintStateRef.current = null;
        }}
        onPointerDown={(event) => {
          const automaton = automatonRef.current;
          const geometry = geometryRef.current;
          const canvas = canvasRef.current;
          if (!automaton || !geometry || !canvas) return;
          const bounds = canvas.getBoundingClientRect();
          const cell = cellAtPoint(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
            geometry,
            automaton,
          );
          if (!cell) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const state = nextState(automaton.backgroundStates[cell.index]! as GridNetworkCellState);
          paintStateRef.current = state;
          paintAt(event.clientX, event.clientY, state);
        }}
        onPointerMove={(event) => {
          const state = paintStateRef.current;
          if ((event.buttons & 1) === 0 || state === null) return;
          paintAt(event.clientX, event.clientY, state);
        }}
        onPointerUp={() => {
          paintStateRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const automaton = automatonRef.current;
          if (!automaton) return;
          event.preventDefault();
          const cell = focusedCellRef.current
            ?? automaton.network.cells[Math.floor(automaton.network.cells.length / 2)]!;
          const state = nextState(automaton.backgroundStates[cell.index]! as GridNetworkCellState);
          automatonRef.current = setGridNetworkBackgroundState(
            automaton,
            cell.column,
            cell.row,
            state,
          );
          drawRef.current?.();
        }}
      />
    </main>
  );
}
