"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ant-colony.module.css";
import {
  createAntColony,
  measureColony,
  nourishColony,
  resizeAntColony,
  stepAntColony,
  type AntColony,
  type ColonyEvents,
} from "./model";

type FieldRaster = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
};

const EMPTY_EVENTS: ColonyEvents = { divided: 0, died: 0 };

function makeFieldRaster(columns: number, rows: number): FieldRaster | null {
  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext("2d");
  if (!context) return null;
  return { canvas, context, image: context.createImageData(columns, rows) };
}

function paintField(raster: FieldRaster, colony: AntColony) {
  if (
    raster.canvas.width !== colony.columns ||
    raster.canvas.height !== colony.rows
  ) {
    raster.canvas.width = colony.columns;
    raster.canvas.height = colony.rows;
    raster.image = raster.context.createImageData(colony.columns, colony.rows);
  }

  for (let index = 0; index < colony.food.length; index += 1) {
    const food = Math.min(1, colony.food[index] * 1.18);
    const trail = Math.min(1, colony.pheromone[index] * 1.3);
    const alpha = Math.min(0.46, food * 0.3 + trail * 0.3);
    const offset = index * 4;
    const foodWeight = food / Math.max(0.0001, food + trail);
    raster.image.data[offset] = Math.round(73 * foodWeight + 53 * (1 - foodWeight));
    raster.image.data[offset + 1] = Math.round(105 * foodWeight + 83 * (1 - foodWeight));
    raster.image.data[offset + 2] = Math.round(88 * foodWeight + 92 * (1 - foodWeight));
    raster.image.data[offset + 3] = Math.round(alpha * 255);
  }
  raster.context.putImageData(raster.image, 0, 0);
}

function drawColony(
  context: CanvasRenderingContext2D,
  colony: AntColony,
  raster: FieldRaster | null,
) {
  const width = context.canvas.clientWidth;
  const height = context.canvas.clientHeight;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#e2e6e0";
  context.fillRect(0, 0, width, height);

  if (raster) {
    paintField(raster, colony);
    context.save();
    context.imageSmoothingEnabled = true;
    context.drawImage(raster.canvas, 0, 0, width, height);
    context.restore();
  }

  context.beginPath();
  for (const agent of colony.agents) {
    if (agent.age < 0.72) continue;
    const radius = 1.1 + agent.energy * 1.1;
    context.moveTo(agent.x + radius, agent.y);
    context.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
  }
  context.fillStyle = "rgba(23, 32, 28, 0.76)";
  context.fill();

  context.beginPath();
  for (const agent of colony.agents) {
    if (agent.age >= 0.72) continue;
    const radius = 1.35 + agent.energy * 1.15;
    context.moveTo(agent.x + radius, agent.y);
    context.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
  }
  context.fillStyle = "rgba(70, 105, 111, 0.92)";
  context.fill();
}

export default function AntColonyOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const colonyRef = useRef<AntColony | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pausedRef = useRef(false);
  const eventTotalRef = useRef<ColonyEvents>({ ...EMPTY_EVENTS });
  const [paused, setPaused] = useState(false);
  const [readout, setReadout] = useState({
    population: 0,
    diversity: 0,
    events: EMPTY_EVENTS,
  });

  const refreshReadout = useCallback(() => {
    const colony = colonyRef.current;
    if (!colony) return;
    const measure = measureColony(colony);
    setReadout({
      ...measure,
      events: eventTotalRef.current,
    });
    eventTotalRef.current = { ...EMPTY_EVENTS };
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
    let fieldRaster: FieldRaster | null = null;
    let previousTime = performance.now();
    let latestReadout = previousTime;

    const sizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextSize = { width: bounds.width, height: bounds.height };
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      colonyRef.current = colonyRef.current
        ? resizeAntColony(colonyRef.current, sizeRef.current, nextSize)
        : createAntColony(bounds.width, bounds.height);
      sizeRef.current = nextSize;
      fieldRaster = makeFieldRaster(
        colonyRef.current.columns,
        colonyRef.current.rows,
      );
      refreshReadout();
    };

    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;
      if (colonyRef.current && !pausedRef.current && !reduceMotion.matches) {
        const result = stepAntColony(
          colonyRef.current,
          sizeRef.current.width,
          sizeRef.current.height,
          delta,
        );
        colonyRef.current = result.colony;
        eventTotalRef.current = {
          divided: eventTotalRef.current.divided + result.events.divided,
          died: eventTotalRef.current.died + result.events.died,
        };
      }
      if (colonyRef.current) drawColony(context, colonyRef.current, fieldRaster);
      if (time - latestReadout > 360) {
        refreshReadout();
        latestReadout = time;
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

  const nourishAt = (x: number, y: number) => {
    const colony = colonyRef.current;
    if (!colony) return;
    colonyRef.current = nourishColony(colony, { x, y });
  };

  const beginAgain = () => {
    colonyRef.current = createAntColony(sizeRef.current.width, sizeRef.current.height);
    eventTotalRef.current = { ...EMPTY_EVENTS };
    refreshReadout();
  };

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A self-replicating ant colony. Press the field to place a local nutrient source. Each agent follows only nearby food and traces, divides with a small inherited mutation, and can die when its energy is exhausted."
        tabIndex={0}
        onPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          nourishAt(event.clientX - bounds.left, event.clientY - bounds.top);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          nourishAt(
            event.currentTarget.clientWidth / 2,
            event.currentTarget.clientHeight / 2,
          );
        }}
      />

      <header className={styles.header}>
        <h1>ant colony</h1>
        <p>local sensing / inherited variation</p>
      </header>

      <section className={styles.readout} aria-label="Colony activity">
        <dl>
          <div><dt>bodies</dt><dd>{readout.population}</dd></div>
          <div><dt>variation</dt><dd>{readout.diversity.toFixed(2)}</dd></div>
          <div><dt>divisions</dt><dd>{readout.events.divided}</dd></div>
          <div><dt>loss</dt><dd>{readout.events.died}</dd></div>
        </dl>
        <div className={styles.actions}>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "continue" : "pause"}
          </button>
          <button type="button" onClick={beginAgain}>begin again</button>
          <p>press to nourish</p>
        </div>
      </section>
    </main>
  );
}
