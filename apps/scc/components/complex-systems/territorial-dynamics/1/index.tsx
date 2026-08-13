"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./territorial-dynamics.module.css";
import {
  advanceTerritoryWorld,
  countTerritory,
  createTerritoryWorld,
  relationPairs,
  territoryCenter,
  type DiplomaticEvent,
  type Relation,
  type TerritoryWorld,
} from "./model";

const CELL_SIZE = 9;
const STEP_MILLISECONDS = 82;

const NATION_COLORS = [
  "#b65e4d",
  "#4e7581",
  "#9a783d",
  "#836c98",
  "#567857",
  "#a65f73",
  "#5a6d9d",
  "#9c6d47",
  "#6f8678",
  "#9a8a4d",
] as const;

type Readout = {
  territory: number[];
  event: DiplomaticEvent | null;
  alliances: number;
  wars: number;
};

function terrainColor(elevation: number, moisture: number) {
  if (elevation < 0.37) return "#9dbac0";
  if (elevation < 0.5) return "#b8c8c1";
  if (elevation > 0.81) return "#c6c5b8";
  if (elevation > 0.69) return "#afb49d";
  return moisture > 0.58 ? "#9eae91" : "#b3ad87";
}

function relationColor(relation: Relation) {
  if (relation === "war") return "rgba(106, 40, 33, 0.96)";
  if (relation === "allied") return "rgba(247, 244, 226, 0.92)";
  return "rgba(36, 50, 43, 0.54)";
}

function eventText(event: DiplomaticEvent | null, world: TerritoryWorld | null) {
  if (!event || !world) return "frontiers are still looking for one another";
  const first = world.nations[event.first]?.name ?? "a nation";
  const second = world.nations[event.second]?.name ?? "a nation";
  const verb = {
    pact: "formed a pact with",
    betrayal: "broke with",
    war: "declared war on",
    truce: "accepted a truce with",
  }[event.kind];
  return `${first} ${verb} ${second}`;
}

function drawRiver(
  context: CanvasRenderingContext2D,
  world: TerritoryWorld,
  river: number[],
  cellWidth: number,
  cellHeight: number,
) {
  if (river.length < 2) return;
  context.beginPath();
  river.forEach((index, routeIndex) => {
    const x = ((index % world.columns) + 0.5) * cellWidth;
    const y = (Math.floor(index / world.columns) + 0.5) * cellHeight;
    if (routeIndex === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = "rgba(80, 133, 149, 0.5)";
  context.lineWidth = 0.75;
  context.lineCap = "round";
  context.stroke();
}

function drawPhysicalDetail(
  context: CanvasRenderingContext2D,
  world: TerritoryWorld,
  cellWidth: number,
  cellHeight: number,
) {
  context.beginPath();
  for (let index = 0; index < world.land.length; index += 1) {
    const column = index % world.columns;
    const row = Math.floor(index / world.columns);
    const land = world.land[index] === 1;
    for (const [columnOffset, rowOffset] of [[1, 0], [0, 1]] as const) {
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn >= world.columns || nextRow >= world.rows) continue;
      const nextIndex = nextRow * world.columns + nextColumn;
      if (world.land[nextIndex] === (land ? 1 : 0)) continue;
      if (columnOffset === 1) {
        const x = (column + 1) * cellWidth;
        context.moveTo(x, row * cellHeight);
        context.lineTo(x, (row + 1) * cellHeight);
      } else {
        const y = (row + 1) * cellHeight;
        context.moveTo(column * cellWidth, y);
        context.lineTo((column + 1) * cellWidth, y);
      }
    }
  }
  context.strokeStyle = "rgba(50, 91, 96, 0.74)";
  context.lineWidth = 0.75;
  context.stroke();

  context.beginPath();
  for (let index = 0; index < world.land.length; index += 1) {
    if (world.land[index] === 0) continue;
    const column = index % world.columns;
    const row = Math.floor(index / world.columns);
    const contour = Math.floor(world.elevation[index] * 9);
    for (const [columnOffset, rowOffset] of [[1, 0], [0, 1]] as const) {
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn >= world.columns || nextRow >= world.rows) continue;
      const nextIndex = nextRow * world.columns + nextColumn;
      if (world.land[nextIndex] === 0 || Math.floor(world.elevation[nextIndex] * 9) === contour) continue;
      if (columnOffset === 1) {
        const x = (column + 1) * cellWidth;
        context.moveTo(x, row * cellHeight);
        context.lineTo(x, (row + 1) * cellHeight);
      } else {
        const y = (row + 1) * cellHeight;
        context.moveTo(column * cellWidth, y);
        context.lineTo((column + 1) * cellWidth, y);
      }
    }
  }
  context.strokeStyle = "rgba(56, 67, 50, 0.16)";
  context.lineWidth = 0.36;
  context.stroke();
}

function drawMap(context: CanvasRenderingContext2D, world: TerritoryWorld) {
  const { clientWidth: width, clientHeight: height } = context.canvas;
  const cellWidth = width / world.columns;
  const cellHeight = height / world.rows;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#b2c8ca";
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < world.owners.length; index += 1) {
    const column = index % world.columns;
    const row = Math.floor(index / world.columns);
    const x = column * cellWidth;
    const y = row * cellHeight;
    const elevation = world.elevation[index];
    const owner = world.owners[index];
    context.fillStyle = terrainColor(elevation, world.moisture[index]);
    context.fillRect(x, y, cellWidth + 0.3, cellHeight + 0.3);
    if (owner < 0 || world.land[index] === 0) continue;
    context.globalAlpha = 0.5 + world.elevation[index] * 0.18;
    context.fillStyle = NATION_COLORS[owner];
    context.fillRect(x, y, cellWidth + 0.3, cellHeight + 0.3);
    context.globalAlpha = 1;
  }

  drawPhysicalDetail(context, world, cellWidth, cellHeight);
  for (const river of world.rivers) drawRiver(context, world, river, cellWidth, cellHeight);

  context.lineCap = "round";
  for (let index = 0; index < world.owners.length; index += 1) {
    const owner = world.owners[index];
    if (owner < 0) continue;
    const column = index % world.columns;
    const row = Math.floor(index / world.columns);
    for (const [columnOffset, rowOffset] of [[1, 0], [0, 1]] as const) {
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn >= world.columns || nextRow >= world.rows) continue;
      const nextIndex = nextRow * world.columns + nextColumn;
      const other = world.owners[nextIndex];
      if (other === owner) continue;
      const relation = other < 0 ? "neutral" : world.relations[owner][other];
      context.beginPath();
      if (columnOffset === 1) {
        const x = (column + 1) * cellWidth;
        context.moveTo(x, row * cellHeight);
        context.lineTo(x, (row + 1) * cellHeight);
      } else {
        const y = (row + 1) * cellHeight;
        context.moveTo(column * cellWidth, y);
        context.lineTo((column + 1) * cellWidth, y);
      }
      context.strokeStyle = relationColor(relation);
      context.lineWidth = relation === "war" ? 1.5 : relation === "allied" ? 0.6 : 0.78;
      if (relation === "allied") context.setLineDash([2.3, 2.1]);
      context.stroke();
      context.setLineDash([]);
    }
  }

  const centers = world.nations.map((_, index) => territoryCenter(world, index));
  for (const [first, second] of relationPairs(world, "allied")) {
    const start = centers[first];
    const end = centers[second];
    if (!start || !end) continue;
    context.beginPath();
    context.moveTo((start.x + 0.5) * cellWidth, (start.y + 0.5) * cellHeight);
    context.lineTo((end.x + 0.5) * cellWidth, (end.y + 0.5) * cellHeight);
    context.strokeStyle = "rgba(244, 242, 224, 0.32)";
    context.lineWidth = 0.7;
    context.setLineDash([4, 5]);
    context.stroke();
    context.setLineDash([]);
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  for (let index = 0; index < world.nations.length; index += 1) {
    const center = centers[index];
    if (!center) continue;
    const territory = world.owners.reduce(
      (total, owner) => total + (owner === index ? 1 : 0),
      0,
    );
    if (territory < 12) continue;
    const x = (center.x + 0.5) * cellWidth;
    const y = (center.y + 0.5) * cellHeight;
    context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillStyle = "rgba(21, 30, 26, 0.88)";
    context.fillText(world.nations[index].name.toUpperCase(), x, y);
    context.beginPath();
    context.arc(x, y + 10, 1.5, 0, Math.PI * 2);
    context.fillStyle = "rgba(247, 244, 230, 0.95)";
    context.fill();
  }
}

function toReadout(world: TerritoryWorld, event: DiplomaticEvent | null): Readout {
  return {
    territory: countTerritory(world),
    event,
    alliances: relationPairs(world, "allied").length,
    wars: relationPairs(world, "war").length,
  };
}

export default function TerritorialDynamicsOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const worldRef = useRef<TerritoryWorld | null>(null);
  const sizeRef = useRef({ columns: 0, rows: 0 });
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState<Readout>({
    territory: [],
    event: null,
    alliances: 0,
    wars: 0,
  });

  const reset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const columns = Math.max(68, Math.floor(canvas.clientWidth / CELL_SIZE));
    const rows = Math.max(42, Math.floor(canvas.clientHeight / CELL_SIZE));
    const world = createTerritoryWorld(columns, rows);
    sizeRef.current = { columns, rows };
    worldRef.current = world;
    setReadout(toReadout(world, null));
    const context = canvas.getContext("2d");
    if (context) drawMap(context, world);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastStep = performance.now();
    let lastReadout = lastStep;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const columns = Math.max(68, Math.floor(bounds.width / CELL_SIZE));
      const rows = Math.max(42, Math.floor(bounds.height / CELL_SIZE));
      if (columns !== sizeRef.current.columns || rows !== sizeRef.current.rows) reset();
      else if (worldRef.current) drawMap(context, worldRef.current);
    };

    const render = (time: number) => {
      const world = worldRef.current;
      if (
        world &&
        !pausedRef.current &&
        !reduceMotion.matches &&
        time - lastStep >= STEP_MILLISECONDS
      ) {
        const result = advanceTerritoryWorld(world);
        worldRef.current = result.world;
        drawMap(context, result.world);
        if (time - lastReadout > 420 || result.latestEvent) {
          setReadout(
            toReadout(
              result.world,
              result.latestEvent ?? result.world.events.at(-1) ?? null,
            ),
          );
          lastReadout = time;
        }
        lastStep = time;
      }
      frameRef.current = requestAnimationFrame(render);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frameRef.current = requestAnimationFrame(render);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reset]);

  const world = worldRef.current;
  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A fictional territorial map where nations expand, form alliances, wage wars, and sometimes betray their allies."
        tabIndex={0}
      />

      <header className={styles.header}>
        <h1>the atlas is arguing</h1>
        <p>territory is only a temporary agreement</p>
      </header>

      <section className={styles.event} aria-live="polite">
        <p>{eventText(readout.event, world)}</p>
        <span>{readout.alliances} pacts / {readout.wars} wars</span>
      </section>

      <section className={styles.nations} aria-label="Fictional nations and their current territory">
        <ul>
          {(world?.nations ?? []).map((nation, index) => (
            <li key={nation.id}>
              <i style={{ backgroundColor: NATION_COLORS[index] }} />
              <span>{nation.name}</span>
              <em>{readout.territory[index] ?? 0}</em>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.controls} aria-label="Territorial dynamics controls">
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "continue" : "pause"}
        </button>
        <button type="button" onClick={reset}>redraw atlas</button>
      </section>
    </main>
  );
}
