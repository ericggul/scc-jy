"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./three-body.module.css";
import {
  INITIAL_INTEGRATOR_TIME_STEP,
  PYTHAGOREAN_INITIAL_STATE,
  advanceDormandPrince,
  kineticEnergy,
  minimumSeparation,
  pairwiseRelations,
  potentialEnergy,
  systemEnergy,
  totalMomentum,
  type ThreeBodyState,
  type Vector,
} from "./model";

const BODY_COLOURS = ["#d95042", "#438194", "#bd922d"] as const;
const PAIR_COLOURS = ["#b86a5a", "#8a7544", "#557f88"] as const;
const MODEL_SECONDS_PER_SECOND = 0.58;
const TRAIL_RECORD_INTERVAL = 4;
const HISTORY_LIMIT = 720;
const READOUT_INTERVAL = 0.05;

type Viewport = Readonly<{
  width: number;
  height: number;
  scale: number;
}>;

type CanvasSurface = Readonly<{
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}>;

type HistorySample = Readonly<{
  time: number;
  state: ThreeBodyState;
  distances: readonly number[];
  kinetic: number;
  potential: number;
  total: number;
}>;

type RelationReadout = Readonly<{
  label: string;
  distance: number;
  force: number;
}>;

type ComputationReadout = Readonly<{
  time: number;
  timeStep: number;
  errorRatio: number;
  minimumDistance: number;
  maximumForce: number;
  kinetic: number;
  potential: number;
  energyDelta: number;
  momentumMagnitude: number;
  relations: readonly RelationReadout[];
}>;

const INITIAL_ENERGY = systemEnergy(PYTHAGOREAN_INITIAL_STATE);

function screenPoint(point: Vector, viewport: Viewport): Vector {
  return {
    x: viewport.width / 2 + point.x * viewport.scale,
    y: viewport.height / 2 - point.y * viewport.scale,
  };
}

function resizeSurface(canvas: HTMLCanvasElement): CanvasSurface | null {
  const context = canvas.getContext("2d");
  const bounds = canvas.getBoundingClientRect();
  if (!context || bounds.width === 0 || bounds.height === 0) return null;

  const deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * deviceRatio);
  canvas.height = Math.round(bounds.height * deviceRatio);
  context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

  return { context, width: bounds.width, height: bounds.height };
}

function drawTrailSegment(
  context: CanvasRenderingContext2D,
  previous: ThreeBodyState,
  current: ThreeBodyState,
  viewport: Viewport,
) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(0.8, Math.min(1.75, viewport.scale * 0.012));

  for (let index = 0; index < current.bodies.length; index += 1) {
    const before = previous.bodies[index];
    const after = current.bodies[index];
    const colour = BODY_COLOURS[index];
    if (!before || !after || !colour) continue;
    const start = screenPoint(before.position, viewport);
    const end = screenPoint(after.position, viewport);
    context.strokeStyle = colour;
    context.globalAlpha = 0.68;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  context.restore();
}

function drawGravitationalRelations(
  context: CanvasRenderingContext2D,
  state: ThreeBodyState,
  viewport: Viewport,
) {
  context.save();
  context.strokeStyle = "#e4e5e0";
  context.lineCap = "round";

  for (const relation of pairwiseRelations(state)) {
    const start = screenPoint(relation.first.position, viewport);
    const end = screenPoint(relation.second.position, viewport);
    context.globalAlpha = Math.min(0.42, 0.055 + relation.forceMagnitude * 0.014);
    context.lineWidth = Math.min(1.7, 0.45 + relation.forceMagnitude * 0.028);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  context.restore();
}

function drawBodies(
  context: CanvasRenderingContext2D,
  state: ThreeBodyState,
  viewport: Viewport,
) {
  context.save();
  for (let index = 0; index < state.bodies.length; index += 1) {
    const body = state.bodies[index];
    const colour = BODY_COLOURS[index];
    if (!body || !colour) continue;
    const point = screenPoint(body.position, viewport);
    const radius = Math.max(6.5, Math.min(11, Math.sqrt(body.mass) * 3.25));
    context.fillStyle = colour;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#f6f7f1";
    context.globalAlpha = 0.9;
    context.lineWidth = 1.1;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  }
  context.restore();
}

function paintBodies(surface: CanvasSurface, state: ThreeBodyState, viewport: Viewport) {
  surface.context.clearRect(0, 0, surface.width, surface.height);
  drawGravitationalRelations(surface.context, state, viewport);
  drawBodies(surface.context, state, viewport);
}

function drawVelocityPlane(
  surface: CanvasSurface,
  history: readonly HistorySample[],
  state: ThreeBodyState,
) {
  const { context, width, height } = surface;
  context.clearRect(0, 0, width, height);
  const inset = 14;
  const halfExtent = Math.max(1, Math.min(width, height) / 2 - inset);
  const maximumComponent = Math.max(
    0.45,
    ...history.flatMap((sample) =>
      sample.state.bodies.flatMap((body) => [Math.abs(body.velocity.x), Math.abs(body.velocity.y)]),
    ),
    ...state.bodies.flatMap((body) => [Math.abs(body.velocity.x), Math.abs(body.velocity.y)]),
  );
  const scale = halfExtent / (maximumComponent * 1.15);
  const center = { x: width / 2, y: height / 2 };
  const pointForVelocity = (velocity: Vector): Vector => ({
    x: center.x + velocity.x * scale,
    y: center.y - velocity.y * scale,
  });

  context.save();
  context.strokeStyle = "#313432";
  context.globalAlpha = 0.82;
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(inset, center.y);
  context.lineTo(width - inset, center.y);
  context.moveTo(center.x, inset);
  context.lineTo(center.x, height - inset);
  context.stroke();

  for (let index = 0; index < state.bodies.length; index += 1) {
    const colour = BODY_COLOURS[index];
    if (!colour) continue;
    let began = false;
    context.strokeStyle = colour;
    context.globalAlpha = 0.54;
    context.lineWidth = 1.05;
    context.beginPath();
    for (const sample of history) {
      const body = sample.state.bodies[index];
      if (!body) continue;
      const point = pointForVelocity(body.velocity);
      if (!began) {
        context.moveTo(point.x, point.y);
        began = true;
      } else {
        context.lineTo(point.x, point.y);
      }
    }
    if (began) context.stroke();

    const body = state.bodies[index];
    if (!body) continue;
    const point = pointForVelocity(body.velocity);
    context.globalAlpha = 1;
    context.fillStyle = colour;
    context.beginPath();
    context.arc(point.x, point.y, 5.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#f6f7f1";
    context.lineWidth = 0.8;
    context.beginPath();
    context.arc(point.x, point.y, 5.2, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

type HistorySeries = Readonly<{
  colour: string;
  value: (sample: HistorySample) => number;
}>;

function drawTimeSeries(
  surface: CanvasSurface,
  history: readonly HistorySample[],
  series: readonly HistorySeries[],
  minimum: number,
  maximum: number,
  zeroLine: boolean,
) {
  const { context, width, height } = surface;
  context.clearRect(0, 0, width, height);
  if (history.length === 0) return;

  const inset = 12;
  const startTime = history[0]?.time ?? 0;
  const endTime = history.at(-1)?.time ?? startTime + 1;
  const timeSpan = Math.max(0.000001, endTime - startTime);
  const valueSpan = Math.max(0.000001, maximum - minimum);
  const pointFor = (time: number, value: number): Vector => ({
    x: inset + (time - startTime) / timeSpan * (width - inset * 2),
    y: height - inset - (value - minimum) / valueSpan * (height - inset * 2),
  });

  context.save();
  context.strokeStyle = "#313432";
  context.globalAlpha = 0.78;
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(inset, height - inset);
  context.lineTo(width - inset, height - inset);
  if (zeroLine && minimum < 0 && maximum > 0) {
    const zero = pointFor(startTime, 0).y;
    context.moveTo(inset, zero);
    context.lineTo(width - inset, zero);
  }
  context.stroke();

  for (const item of series) {
    context.strokeStyle = item.colour;
    context.globalAlpha = 0.88;
    context.lineWidth = 1.15;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    history.forEach((sample, index) => {
      const point = pointFor(sample.time, item.value(sample));
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();

    const latest = history.at(-1);
    if (!latest) continue;
    const point = pointFor(latest.time, item.value(latest));
    context.globalAlpha = 1;
    context.fillStyle = item.colour;
    context.beginPath();
    context.arc(point.x, point.y, 2.4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawDistanceHistory(surface: CanvasSurface, history: readonly HistorySample[]) {
  const maximum = Math.max(1, ...history.flatMap((sample) => sample.distances)) * 1.08;
  drawTimeSeries(
    surface,
    history,
    [
      { colour: PAIR_COLOURS[0], value: (sample) => sample.distances[0] ?? 0 },
      { colour: PAIR_COLOURS[1], value: (sample) => sample.distances[1] ?? 0 },
      { colour: PAIR_COLOURS[2], value: (sample) => sample.distances[2] ?? 0 },
    ],
    0,
    maximum,
    false,
  );
}

function drawEnergyHistory(surface: CanvasSurface, history: readonly HistorySample[]) {
  const maximumMagnitude = Math.max(
    1,
    ...history.flatMap((sample) => [Math.abs(sample.kinetic), Math.abs(sample.potential), Math.abs(sample.total)]),
  ) * 1.08;
  drawTimeSeries(
    surface,
    history,
    [
      { colour: "#e1e2dc", value: (sample) => sample.kinetic },
      { colour: "#6f9fab", value: (sample) => sample.potential },
      { colour: "#bd6e5d", value: (sample) => sample.total },
    ],
    -maximumMagnitude,
    maximumMagnitude,
    true,
  );
}

function createSample(time: number, state: ThreeBodyState): HistorySample {
  return {
    time,
    state,
    distances: pairwiseRelations(state).map((relation) => relation.distance),
    kinetic: kineticEnergy(state),
    potential: potentialEnergy(state),
    total: systemEnergy(state),
  };
}

function createReadout(
  time: number,
  state: ThreeBodyState,
  timeStep: number,
  errorRatio: number,
): ComputationReadout {
  const relations = pairwiseRelations(state);
  const momentum = totalMomentum(state);
  const total = systemEnergy(state);

  return {
    time,
    timeStep,
    errorRatio,
    minimumDistance: minimumSeparation(state),
    maximumForce: Math.max(...relations.map((relation) => relation.forceMagnitude)),
    kinetic: kineticEnergy(state),
    potential: potentialEnergy(state),
    energyDelta: total - INITIAL_ENERGY,
    momentumMagnitude: Math.hypot(momentum.x, momentum.y),
    relations: relations.map((relation) => ({
      label: `${relation.first.mass}–${relation.second.mass}`,
      distance: relation.distance,
      force: relation.forceMagnitude,
    })),
  };
}

function formatValue(value: number, digits = 3) {
  const absolute = Math.abs(value);
  if (absolute === 0) return "0";
  if (absolute >= 10_000 || absolute < 0.001) return value.toExponential(2);
  return value.toFixed(digits);
}

const INITIAL_READOUT = createReadout(
  0,
  PYTHAGOREAN_INITIAL_STATE,
  INITIAL_INTEGRATOR_TIME_STEP,
  0,
);

export default function ThreeBodyOne() {
  const fieldRef = useRef<HTMLElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const bodyCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const distanceCanvasRef = useRef<HTMLCanvasElement>(null);
  const energyCanvasRef = useRef<HTMLCanvasElement>(null);
  const [readout, setReadout] = useState<ComputationReadout>(INITIAL_READOUT);

  useEffect(() => {
    const field = fieldRef.current;
    const trailCanvas = trailCanvasRef.current;
    const bodyCanvas = bodyCanvasRef.current;
    const velocityCanvas = velocityCanvasRef.current;
    const distanceCanvas = distanceCanvasRef.current;
    const energyCanvas = energyCanvasRef.current;
    if (!field || !trailCanvas || !bodyCanvas || !velocityCanvas || !distanceCanvas || !energyCanvas) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let viewport: Viewport = { width: 0, height: 0, scale: 0 };
    let trailSurface: CanvasSurface | null = null;
    let bodySurface: CanvasSurface | null = null;
    let velocitySurface: CanvasSurface | null = null;
    let distanceSurface: CanvasSurface | null = null;
    let energySurface: CanvasSurface | null = null;
    let state = PYTHAGOREAN_INITIAL_STATE;
    let previousTrailState = state;
    let modelTime = 0;
    let accumulatedTime = 0;
    let stepsSinceTrail = 0;
    let nextTimeStep = INITIAL_INTEGRATOR_TIME_STEP;
    let acceptedTimeStep = INITIAL_INTEGRATOR_TIME_STEP;
    let lastErrorRatio = 0;
    let lastReadoutTime = -Infinity;
    let history: HistorySample[] = [createSample(modelTime, state)];
    let previousFrame = performance.now();
    let frameId: number | null = null;

    const clearTrails = () => {
      if (!trailSurface) return;
      trailSurface.context.clearRect(0, 0, trailSurface.width, trailSurface.height);
      previousTrailState = state;
    };

    const paint = () => {
      if (!bodySurface || viewport.width === 0 || viewport.height === 0) return;
      paintBodies(bodySurface, state, viewport);
      if (velocitySurface) drawVelocityPlane(velocitySurface, history, state);
      if (distanceSurface) drawDistanceHistory(distanceSurface, history);
      if (energySurface) drawEnergyHistory(energySurface, history);
    };

    const publishReadout = () => {
      if (modelTime - lastReadoutTime < READOUT_INTERVAL) return;
      lastReadoutTime = modelTime;
      setReadout(createReadout(modelTime, state, acceptedTimeStep, lastErrorRatio));
    };

    const advance = (elapsed: number) => {
      accumulatedTime += Math.min(elapsed, 0.05) * MODEL_SECONDS_PER_SECOND;
      let substeps = 0;

      while (accumulatedTime >= nextTimeStep && substeps < 320) {
        const result = advanceDormandPrince(state, nextTimeStep);
        state = result.state;
        modelTime += result.timeStep;
        accumulatedTime -= result.timeStep;
        acceptedTimeStep = result.timeStep;
        nextTimeStep = result.nextTimeStep;
        lastErrorRatio = result.errorRatio;
        substeps += 1;
        stepsSinceTrail += 1;

        if (stepsSinceTrail === TRAIL_RECORD_INTERVAL) {
          if (trailSurface) drawTrailSegment(trailSurface.context, previousTrailState, state, viewport);
          previousTrailState = state;
          history.push(createSample(modelTime, state));
          if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
          stepsSinceTrail = 0;
        }
      }

      if (substeps > 0) publishReadout();
    };

    const animate = (time: number) => {
      const elapsed = (time - previousFrame) / 1_000;
      previousFrame = time;
      advance(elapsed);
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      viewport = {
        width: bounds.width,
        height: bounds.height,
        scale: Math.min(bounds.width, bounds.height) * 0.1,
      };
      trailSurface = resizeSurface(trailCanvas);
      bodySurface = resizeSurface(bodyCanvas);
      velocitySurface = resizeSurface(velocityCanvas);
      distanceSurface = resizeSurface(distanceCanvas);
      energySurface = resizeSurface(energyCanvas);
      clearTrails();
      paint();
    };

    const handleMotionPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      previousFrame = performance.now();
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(field);
    observer.observe(velocityCanvas);
    observer.observe(distanceCanvas);
    observer.observe(energyCanvas);
    reducedMotion.addEventListener("change", handleMotionPreference);
    resize();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <main className={styles.experiment}>
      <section ref={fieldRef} className={styles.field} aria-label="Newtonian three-body configuration plane">
        <canvas ref={trailCanvasRef} className={styles.fieldCanvas} aria-hidden="true" />
        <canvas
          ref={bodyCanvasRef}
          className={styles.fieldCanvas}
          role="img"
          aria-label="Three unequal masses following their calculated Newtonian gravitational motion."
        />
      </section>

      <section className={styles.analysis} aria-label="Current three-body computation">
        <div className={styles.parallelViews}>
          <section className={styles.view} aria-label="Velocity phase plane">
            <h2 className={styles.viewLabel}>vₓ / vᵧ</h2>
            <canvas
              ref={velocityCanvasRef}
              className={styles.analysisCanvas}
              role="img"
              aria-label="Current and historical velocities of the three masses."
            />
          </section>
          <section className={styles.view} aria-label="Pair separation history">
            <h2 className={styles.viewLabel}>r₃₄(t) · r₃₅(t) · r₄₅(t)</h2>
            <canvas
              ref={distanceCanvasRef}
              className={styles.analysisCanvas}
              role="img"
              aria-label="Recent separations between each pair of masses."
            />
          </section>
          <section className={styles.view} aria-label="Energy exchange history">
            <h2 className={styles.viewLabel}>T(t) · U(t) · E(t)</h2>
            <canvas
              ref={energyCanvasRef}
              className={styles.analysisCanvas}
              role="img"
              aria-label="Recent kinetic, potential, and total energy."
            />
          </section>
        </div>

        <section className={styles.currentCalculation} aria-label="Current integrator and system values">
          <dl className={styles.scalarRegister}>
            <div><dt>t</dt><dd>{formatValue(readout.time)}</dd></div>
            <div><dt>h</dt><dd>{formatValue(readout.timeStep, 5)}</dd></div>
            <div><dt>ε</dt><dd>{formatValue(readout.errorRatio, 2)}</dd></div>
            <div><dt>min rᵢⱼ</dt><dd>{formatValue(readout.minimumDistance, 5)}</dd></div>
            <div><dt>max |Fᵢⱼ|</dt><dd>{formatValue(readout.maximumForce)}</dd></div>
            <div><dt>ΔE</dt><dd>{formatValue(readout.energyDelta, 5)}</dd></div>
            <div><dt>|P|</dt><dd>{formatValue(readout.momentumMagnitude, 5)}</dd></div>
            <div><dt>T / U</dt><dd>{formatValue(readout.kinetic)} / {formatValue(readout.potential)}</dd></div>
          </dl>

          <dl className={styles.relationRegister}>
            {readout.relations.map((relation, index) => (
              <div key={relation.label} className={styles.relation}>
                <dt style={{ color: PAIR_COLOURS[index] }}>{relation.label}</dt>
                <dd>r {formatValue(relation.distance, 5)}</dd>
                <dd>|F| {formatValue(relation.force, 5)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}
