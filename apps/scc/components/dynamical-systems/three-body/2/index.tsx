"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./three-body.module.css";
import {
  accelerationsFor,
  GRAVITATIONAL_CONSTANT,
  INITIAL_INTEGRATOR_TIME_STEP,
  createInitialState,
  DEFAULT_BODY_COUNT,
  MIN_BODY_COUNT,
  MAX_BODY_COUNT,
  SOFTENING_LENGTH,
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

const BODY_COLOURS = Array.from({ length: MAX_BODY_COUNT }, (_, index) =>
  ["#d95042", "#438194", "#bd922d"][index] ?? `hsl(${(index * 137.508) % 360} 46% 57%)`,
);
const PAIR_COLOURS = ["#b86a5a", "#8a7544", "#557f88"] as const;
const MODEL_SECONDS_PER_SECOND = 1.15;
const HISTORY_SAMPLE_INTERVAL = 0.14;
const ANALYSIS_INTERVAL_MS = 250;
const FRAME_COMPUTE_BUDGET_MS = 5;
const MAX_FRAME_STEPS = 32;
const HISTORY_LIMIT = 180;
const READOUT_INTERVAL = 0.2;
const RELATION_FORCE_FRACTION = 0.025;
const MAX_RELATION_LINES = 96;
const RELATIVE_VIEW_SMOOTHING_PER_SECOND = 14;

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
  nodeKinematics: readonly NodeKinematics[];
  nodeEnergies: readonly NodeEnergy[];
}>;

type NodeKinematics = Readonly<{
  speed: number;
  acceleration: number;
  heading: number;
  angularVelocity: number;
}>;

type NodeEnergy = Readonly<{
  kinetic: number;
  potential: number;
  total: number;
}>;

type RelationReadout = Readonly<{
  id: string;
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

const INITIAL_STATE = createInitialState(DEFAULT_BODY_COUNT);
const INITIAL_ENERGY = systemEnergy(INITIAL_STATE);

function screenPoint(point: Vector, viewport: Viewport): Vector {
  return {
    x: viewport.width / 2 + point.x * viewport.scale,
    y: viewport.height / 2 - point.y * viewport.scale,
  };
}

function resizeSurface(canvas: HTMLCanvasElement, maximumDeviceRatio = 2): CanvasSurface | null {
  const context = canvas.getContext("2d");
  const bounds = canvas.getBoundingClientRect();
  if (!context || bounds.width === 0 || bounds.height === 0) return null;

  const deviceRatio = Math.min(window.devicePixelRatio || 1, maximumDeviceRatio);
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
  const relations = [...pairwiseRelations(state)]
    .sort((first, second) => second.forceMagnitude - first.forceMagnitude)
    .slice(0, MAX_RELATION_LINES);
  const strongestForce = relations[0]?.forceMagnitude ?? 0;
  if (strongestForce === 0) return;
  const threshold = strongestForce * RELATION_FORCE_FRACTION;

  context.save();
  context.strokeStyle = "#e4e5e0";
  context.lineCap = "round";

  for (const relation of relations) {
    if (relation.forceMagnitude < threshold) continue;
    const start = screenPoint(relation.first.position, viewport);
    const end = screenPoint(relation.second.position, viewport);
    const strength = relation.forceMagnitude / strongestForce;
    context.globalAlpha = 0.2 + strength * 0.6;
    context.lineWidth = 0.9 + strength * 2.6;
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
    const radius = Math.max(3.25, Math.min(5.5, Math.sqrt(body.mass) * 1.625));
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

function paintBodies(
  surface: CanvasSurface,
  state: ThreeBodyState,
  viewport: Viewport,
  showRelations: boolean,
) {
  surface.context.clearRect(0, 0, surface.width, surface.height);
  if (showRelations) drawGravitationalRelations(surface.context, state, viewport);
  drawBodies(surface.context, state, viewport);
}

function smoothRelativeViewState(
  current: ThreeBodyState,
  target: ThreeBodyState,
  amount: number,
): ThreeBodyState {
  return {
    bodies: target.bodies.map((targetBody, index) => {
      const currentBody = current.bodies[index];
      if (!currentBody || currentBody.id !== targetBody.id) return targetBody;
      return {
        ...targetBody,
        position: {
          x: currentBody.position.x + (targetBody.position.x - currentBody.position.x) * amount,
          y: currentBody.position.y + (targetBody.position.y - currentBody.position.y) * amount,
        },
        velocity: {
          x: currentBody.velocity.x + (targetBody.velocity.x - currentBody.velocity.x) * amount,
          y: currentBody.velocity.y + (targetBody.velocity.y - currentBody.velocity.y) * amount,
        },
      };
    }),
  };
}

function drawRelativeForceField(
  surface: CanvasSurface,
  state: ThreeBodyState,
  originId: string,
) {
  const { context, width, height } = surface;
  context.clearRect(0, 0, width, height);
  const originIndex = state.bodies.findIndex((body) => body.id === originId);
  const origin = state.bodies[originIndex];
  const originColour = BODY_COLOURS[originIndex];
  if (!origin || !originColour) return;

  const observations: Array<Readonly<{
    otherIndex: number;
    relativeX: number;
    relativeY: number;
    force: number;
  }>> = [];
  let maximumDistance = 1;
  let maximumForce = 0;

  for (let otherIndex = 0; otherIndex < state.bodies.length; otherIndex += 1) {
    if (otherIndex === originIndex) continue;
    const other = state.bodies[otherIndex];
    if (!other) continue;
    const relativeX = other.position.x - origin.position.x;
    const relativeY = other.position.y - origin.position.y;
    const distance = Math.hypot(relativeX, relativeY);
    const softenedDistanceSquared = distance ** 2 + SOFTENING_LENGTH ** 2;
    const force = GRAVITATIONAL_CONSTANT * origin.mass * other.mass * distance /
      (softenedDistanceSquared * Math.sqrt(softenedDistanceSquared));
    observations.push({ otherIndex, relativeX, relativeY, force });
    maximumDistance = Math.max(maximumDistance, distance);
    maximumForce = Math.max(maximumForce, force);
  }

  const fieldRadius = Math.max(1, Math.min(width, height) / 2 - 16);
  const scale = fieldRadius / (maximumDistance * 1.08);
  const centerX = width / 2;
  const centerY = height / 2;
  const speed = Math.hypot(origin.velocity.x, origin.velocity.y);
  const heading = speed > 0.000001
    ? { x: origin.velocity.x / speed, y: origin.velocity.y / speed }
    : { x: 0, y: 1 };

  context.save();
  context.strokeStyle = "#313432";
  context.globalAlpha = 0.82;
  context.lineWidth = 0.7;
  context.beginPath();
  context.moveTo(centerX - fieldRadius, centerY);
  context.lineTo(centerX + fieldRadius, centerY);
  context.moveTo(centerX, centerY + fieldRadius);
  context.lineTo(centerX, centerY - fieldRadius);
  context.moveTo(centerX, centerY - fieldRadius);
  context.lineTo(centerX - fieldRadius * 0.06, centerY - fieldRadius * 0.88);
  context.moveTo(centerX, centerY - fieldRadius);
  context.lineTo(centerX + fieldRadius * 0.06, centerY - fieldRadius * 0.88);
  context.stroke();

  for (const { otherIndex, relativeX, relativeY, force } of observations) {
    const colour = BODY_COLOURS[otherIndex];
    if (!colour) continue;
    const right = relativeX * heading.y - relativeY * heading.x;
    const forward = relativeX * heading.x + relativeY * heading.y;
    const pointX = centerX + right * scale;
    const pointY = centerY - forward * scale;
    const forceStrength = maximumForce === 0 ? 0 : Math.sqrt(force / maximumForce);

    context.strokeStyle = colour;
    context.globalAlpha = 0.08 + forceStrength * 0.64;
    context.lineWidth = 0.5 + forceStrength * 2.15;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(pointX, pointY);
    context.stroke();

    context.fillStyle = colour;
    context.globalAlpha = 0.46 + forceStrength * 0.54;
    context.beginPath();
    context.arc(pointX, pointY, 1.3 + forceStrength * 2.15, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = originColour;
  context.globalAlpha = 1;
  context.beginPath();
  context.arc(centerX, centerY, 4, 0, Math.PI * 2);
  context.fill();
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

function nodeIndexFor(nodeId: string) {
  const index = Number(nodeId.replace("body-", "")) - 1;
  return Number.isInteger(index) ? index : -1;
}

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function metricBounds(values: readonly number[], includeZero: boolean, symmetric = false) {
  const minimum = Math.min(...values, ...(includeZero ? [0] : []));
  const maximum = Math.max(...values, ...(includeZero ? [0] : []));
  if (symmetric) {
    const extent = Math.max(0.000001, Math.abs(minimum), Math.abs(maximum)) * 1.1;
    return { minimum: -extent, maximum: extent };
  }
  const padding = Math.max(0.000001, (maximum - minimum) * 0.12);
  return { minimum: minimum - padding, maximum: maximum + padding };
}

function drawNodeMetric(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  colour: string,
  values: readonly number[],
  minimum: number,
  maximum: number,
) {
  const inset = 7;
  const labelHeight = 14;
  const chartTop = y + labelHeight;
  const chartHeight = Math.max(1, height - labelHeight - inset);
  const span = Math.max(0.000001, maximum - minimum);

  context.fillStyle = colour;
  context.globalAlpha = 0.9;
  context.font = "9px var(--font-geist-mono), ui-monospace, monospace";
  context.textBaseline = "top";
  context.fillText(label, x + inset, y + 2);

  context.strokeStyle = "#313432";
  context.globalAlpha = 0.75;
  context.lineWidth = 0.65;
  context.beginPath();
  context.moveTo(x + inset, chartTop + chartHeight);
  context.lineTo(x + width - inset, chartTop + chartHeight);
  if (minimum < 0 && maximum > 0) {
    const zeroY = chartTop + chartHeight - (-minimum / span) * chartHeight;
    context.moveTo(x + inset, zeroY);
    context.lineTo(x + width - inset, zeroY);
  }
  context.stroke();

  if (values.length === 0) return;
  context.strokeStyle = colour;
  context.globalAlpha = 0.9;
  context.lineWidth = 1;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  values.forEach((value, index) => {
    const pointX = x + inset + index / Math.max(1, values.length - 1) * (width - inset * 2);
    const pointY = chartTop + chartHeight - (value - minimum) / span * chartHeight;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  });
  context.stroke();
}

function drawNodeKinematics(
  surface: CanvasSurface,
  history: readonly HistorySample[],
  nodeId: string,
) {
  const { context, width, height } = surface;
  context.clearRect(0, 0, width, height);
  const nodeIndex = nodeIndexFor(nodeId);
  if (nodeIndex < 0) return;
  const kinematics: NodeKinematics[] = [];
  for (const sample of history) {
    const measurement = sample.nodeKinematics[nodeIndex];
    if (measurement) kinematics.push(measurement);
  }
  if (kinematics.length === 0) return;

  const speed = kinematics.map((sample) => sample.speed);
  const acceleration = kinematics.map((sample) => sample.acceleration);
  const heading = kinematics.map((sample) => sample.heading);
  const angularVelocity = kinematics.map((sample) => sample.angularVelocity);
  const gap = 8;
  const cellWidth = (width - gap) / 2;
  const cellHeight = (height - gap) / 2;

  context.save();
  const speedBounds = metricBounds(speed, true);
  const accelerationBounds = metricBounds(acceleration, true);
  const headingBounds = metricBounds(heading, false);
  const angularVelocityBounds = metricBounds(angularVelocity, true, true);
  drawNodeMetric(context, 0, 0, cellWidth, cellHeight, "|v|", "#e1e2dc", speed, speedBounds.minimum, speedBounds.maximum);
  drawNodeMetric(context, cellWidth + gap, 0, cellWidth, cellHeight, "|a|", "#6f9fab", acceleration, accelerationBounds.minimum, accelerationBounds.maximum);
  drawNodeMetric(context, 0, cellHeight + gap, cellWidth, cellHeight, "θ", "#bd922d", heading, headingBounds.minimum, headingBounds.maximum);
  drawNodeMetric(context, cellWidth + gap, cellHeight + gap, cellWidth, cellHeight, "ω", "#bd6e5d", angularVelocity, angularVelocityBounds.minimum, angularVelocityBounds.maximum);
  context.restore();
}

function drawNodeEnergyHistory(
  surface: CanvasSurface,
  history: readonly HistorySample[],
  nodeId: string,
) {
  const nodeIndex = nodeIndexFor(nodeId);
  if (nodeIndex < 0) return;
  const energyFor = (sample: HistorySample) => sample.nodeEnergies[nodeIndex];
  const maximumMagnitude = Math.max(
    1,
    ...history.flatMap((sample) => {
      const energy = energyFor(sample);
      return energy ? [Math.abs(energy.kinetic), Math.abs(energy.potential), Math.abs(energy.total)] : [];
    }),
  ) * 1.08;
  drawTimeSeries(
    surface,
    history,
    [
      { colour: "#e1e2dc", value: (sample) => energyFor(sample)?.kinetic ?? 0 },
      { colour: "#6f9fab", value: (sample) => energyFor(sample)?.potential ?? 0 },
      { colour: "#bd6e5d", value: (sample) => energyFor(sample)?.total ?? 0 },
    ],
    -maximumMagnitude,
    maximumMagnitude,
    true,
  );
}

function createSample(
  time: number,
  state: ThreeBodyState,
  previous?: HistorySample,
): HistorySample {
  const relations = pairwiseRelations(state);
  const accelerations = accelerationsFor(state);
  const potentialByNode = state.bodies.map(() => 0);
  const indexById = new Map(state.bodies.map((body, index) => [body.id, index]));

  for (const relation of relations) {
    const firstIndex = indexById.get(relation.first.id);
    const secondIndex = indexById.get(relation.second.id);
    if (firstIndex === undefined || secondIndex === undefined) continue;
    const softenedDistance = Math.sqrt(relation.distance ** 2 + SOFTENING_LENGTH ** 2);
    const pairPotential = -GRAVITATIONAL_CONSTANT * relation.first.mass * relation.second.mass /
      softenedDistance;
    potentialByNode[firstIndex] = (potentialByNode[firstIndex] ?? 0) + pairPotential / 2;
    potentialByNode[secondIndex] = (potentialByNode[secondIndex] ?? 0) + pairPotential / 2;
  }

  const nodeEnergies = state.bodies.map((body, index) => {
    const kinetic = body.mass * (body.velocity.x ** 2 + body.velocity.y ** 2) / 2;
    const nodePotential = potentialByNode[index] ?? 0;
    return { kinetic, potential: nodePotential, total: kinetic + nodePotential };
  });
  const elapsed = time - (previous?.time ?? time);
  const nodeKinematics = state.bodies.map((body, index) => {
    const acceleration = accelerations[index] ?? { x: 0, y: 0 };
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const rawHeading = Math.atan2(body.velocity.y, body.velocity.x);
    const previousKinematics = previous?.nodeKinematics[index];
    const heading = previousKinematics
      ? previousKinematics.heading + wrapAngle(rawHeading - previousKinematics.heading)
      : rawHeading;
    return {
      speed,
      acceleration: Math.hypot(acceleration.x, acceleration.y),
      heading,
      angularVelocity: previousKinematics && elapsed > 0
        ? (heading - previousKinematics.heading) / elapsed
        : 0,
    };
  });

  return {
    time,
    nodeKinematics,
    nodeEnergies,
  };
}

function createReadout(
  time: number,
  state: ThreeBodyState,
  timeStep: number,
  errorRatio: number,
  initialEnergy = INITIAL_ENERGY,
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
    energyDelta: total - initialEnergy,
    momentumMagnitude: Math.hypot(momentum.x, momentum.y),
    relations: [...relations].sort((first, second) => second.forceMagnitude - first.forceMagnitude).slice(0, 3).map((relation) => ({
      id: `${relation.first.id}:${relation.second.id}`,
      label: `${relation.first.id.replace("body-", "")}–${relation.second.id.replace("body-", "")}`,
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
  INITIAL_STATE,
  INITIAL_INTEGRATOR_TIME_STEP,
  0,
);

export default function ThreeBodyTwo() {
  const [bodyCount, setBodyCount] = useState(DEFAULT_BODY_COUNT);
  const [showRelations, setShowRelations] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState("body-1");
  const selectedNodeNumber = Math.min(
    bodyCount,
    Math.max(1, Number(selectedNodeId.replace("body-", ""))),
  );
  const activeNodeId = `body-${selectedNodeNumber}`;
  const showRelationsRef = useRef(showRelations);
  const selectedNodeRef = useRef(activeNodeId);
  const selectedNodeChangedRef = useRef(false);
  const fieldRef = useRef<HTMLElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const bodyCanvasRef = useRef<HTMLCanvasElement>(null);
  const velocityCanvasRef = useRef<HTMLCanvasElement>(null);
  const distanceCanvasRef = useRef<HTMLCanvasElement>(null);
  const energyCanvasRef = useRef<HTMLCanvasElement>(null);
  const [readout, setReadout] = useState<ComputationReadout>(INITIAL_READOUT);

  useEffect(() => {
    showRelationsRef.current = showRelations;
  }, [showRelations]);

  useEffect(() => {
    selectedNodeRef.current = activeNodeId;
    selectedNodeChangedRef.current = true;
  }, [activeNodeId]);

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
    let state = createInitialState(bodyCount);
    let relativeViewState = state;
    const initialEnergy = systemEnergy(state);
    let previousTrailState = state;
    let modelTime = 0;
    let accumulatedTime = 0;
    let lastHistoryTime = 0;
    let lastAnalysisTime = -Infinity;
    let analysisDirty = true;
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

    const paint = (forceAnalysis = false) => {
      if (!bodySurface || viewport.width === 0 || viewport.height === 0) return;
      paintBodies(bodySurface, state, viewport, showRelationsRef.current);
      if (velocitySurface) drawRelativeForceField(velocitySurface, relativeViewState, selectedNodeRef.current);
      const now = performance.now();
      const selectedNodeChanged = selectedNodeChangedRef.current;
      if (!forceAnalysis && !selectedNodeChanged && (!analysisDirty || now - lastAnalysisTime < ANALYSIS_INTERVAL_MS)) return;
      lastAnalysisTime = now;
      if (distanceSurface) drawNodeKinematics(distanceSurface, history, selectedNodeRef.current);
      if (energySurface) drawNodeEnergyHistory(energySurface, history, selectedNodeRef.current);
      analysisDirty = false;
      selectedNodeChangedRef.current = false;
    };

    const publishReadout = () => {
      if (modelTime - lastReadoutTime < READOUT_INTERVAL) return;
      lastReadoutTime = modelTime;
      setReadout(createReadout(modelTime, state, acceptedTimeStep, lastErrorRatio, initialEnergy));
    };

    const advance = (elapsed: number) => {
      accumulatedTime = Math.min(0.06, accumulatedTime + Math.min(elapsed, 0.05) * MODEL_SECONDS_PER_SECOND);
      const startedAt = performance.now();
      let substeps = 0;

      while (accumulatedTime >= nextTimeStep && substeps < MAX_FRAME_STEPS && performance.now() - startedAt < FRAME_COMPUTE_BUDGET_MS) {
        const result = advanceDormandPrince(state, nextTimeStep);
        state = result.state;
        modelTime += result.timeStep;
        accumulatedTime -= result.timeStep;
        acceptedTimeStep = result.timeStep;
        nextTimeStep = result.nextTimeStep;
        lastErrorRatio = result.errorRatio;
        substeps += 1;
        if (trailSurface) drawTrailSegment(trailSurface.context, previousTrailState, state, viewport);
        previousTrailState = state;
        if (modelTime - lastHistoryTime >= HISTORY_SAMPLE_INTERVAL) {
          history.push(createSample(modelTime, state, history.at(-1)));
          if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
          lastHistoryTime = modelTime;
          analysisDirty = true;
        }
      }

      if (substeps > 0) publishReadout();
    };

    const animate = (time: number) => {
      const elapsed = (time - previousFrame) / 1_000;
      previousFrame = time;
      advance(elapsed);
      const smoothingAmount = 1 - Math.exp(
        -Math.min(elapsed, 0.05) * RELATIVE_VIEW_SMOOTHING_PER_SECOND,
      );
      relativeViewState = smoothRelativeViewState(relativeViewState, state, smoothingAmount);
      paint();
      if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      viewport = {
        width: bounds.width,
        height: bounds.height,
        scale: Math.min(bounds.width, bounds.height) * 0.077,
      };
      trailSurface = resizeSurface(trailCanvas);
      bodySurface = resizeSurface(bodyCanvas);
      velocitySurface = resizeSurface(velocityCanvas, 1.25);
      distanceSurface = resizeSurface(distanceCanvas, 1.25);
      energySurface = resizeSurface(energyCanvas, 1.25);
      clearTrails();
      paint(true);
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
    publishReadout();
    if (!reducedMotion.matches) frameId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [bodyCount]);

  return (
    <main className={styles.experiment}>
      <section ref={fieldRef} className={styles.field} aria-label="Softened gravitational N-body configuration plane">
        <div className={styles.parameters}>
          <div className={styles.parameterHeading}>
            <label htmlFor="body-count">Elements</label>
            <output id="body-count-value" aria-live="polite">{bodyCount}</output>
          </div>
          <input
            id="body-count"
            type="range"
            min={MIN_BODY_COUNT}
            max={MAX_BODY_COUNT}
            step={1}
            value={bodyCount}
            aria-describedby="body-count-value"
            onChange={(event) => setBodyCount(Number(event.target.value))}
          />
          <span className={styles.parameterHint}>3–32 · restarting state</span>
          <button
            className={styles.relationToggle}
            type="button"
            aria-pressed={showRelations}
            onClick={() => setShowRelations((visible) => !visible)}
          >
            force links {showRelations ? "on" : "off"}
          </button>
        </div>
        <canvas ref={trailCanvasRef} className={styles.fieldCanvas} aria-hidden="true" />
        <canvas
          ref={bodyCanvasRef}
          className={styles.fieldCanvas}
          role="img"
          aria-label="Twenty by default, adjustable unequal masses following their calculated softened gravitational motion."
        />
      </section>

      <section className={styles.analysis} aria-label="Current N-body computation">
        <div className={styles.parallelViews}>
          <section className={styles.view} aria-label="Node-relative force fields">
            <div className={styles.relativeViewHeader}>
              <h2 className={styles.viewLabel}>node-relative force field</h2>
              <div className={styles.nodeSelector} role="group" aria-label="Choose the node at the center of the relative force field">
                {Array.from({ length: bodyCount }, (_, index) => {
                  const nodeId = `body-${index + 1}`;
                  return (
                    <button
                      key={nodeId}
                      type="button"
                      className={styles.nodeChoice}
                      aria-pressed={activeNodeId === nodeId}
                      onClick={() => setSelectedNodeId(nodeId)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
            <canvas
              ref={velocityCanvasRef}
              className={styles.analysisCanvas}
              role="img"
              aria-label={`Node ${activeNodeId.replace("body-", "")} is centered. Its upward axis is its current direction of travel, and every other node appears at its relative position with a force-weighted link.`}
            />
          </section>
          <section className={styles.view} aria-label="Selected node motion history">
            <h2 className={styles.viewLabel}>|v| · |a| · θ · ω</h2>
            <canvas
              ref={distanceCanvasRef}
              className={styles.analysisCanvas}
              role="img"
              aria-label={`Speed, acceleration magnitude, heading angle, and angular velocity over time for node ${activeNodeId.replace("body-", "")}.`}
            />
          </section>
          <section className={styles.view} aria-label="Selected node energy history">
            <h2 className={styles.viewLabel}>Kᵢ(t) · Uᵢ/2(t) · Eᵢ(t)</h2>
            <canvas
              ref={energyCanvasRef}
              className={styles.analysisCanvas}
              role="img"
              aria-label={`Kinetic, allocated potential, and total energy over time for node ${activeNodeId.replace("body-", "")}.`}
            />
          </section>
        </div>

        <section className={styles.currentCalculation} aria-label="Current integrator and system values">
          <div className={styles.scalarRegister} aria-label="Current scalar values">
            <div><span className={styles.scalarLabel}>t</span><span className={styles.scalarValue}>{formatValue(readout.time)}</span></div>
            <div><span className={styles.scalarLabel}>h</span><span className={styles.scalarValue}>{formatValue(readout.timeStep, 5)}</span></div>
            <div><span className={styles.scalarLabel}>error ratio</span><span className={styles.scalarValue}>{formatValue(readout.errorRatio, 2)}</span></div>
            <div><span className={styles.scalarLabel}>min rᵢⱼ</span><span className={styles.scalarValue}>{formatValue(readout.minimumDistance, 5)}</span></div>
            <div><span className={styles.scalarLabel}>max |Fᵢⱼ|</span><span className={styles.scalarValue}>{formatValue(readout.maximumForce)}</span></div>
            <div><span className={styles.scalarLabel}>ΔE</span><span className={styles.scalarValue}>{formatValue(readout.energyDelta, 5)}</span></div>
            <div><span className={styles.scalarLabel}>|P|</span><span className={styles.scalarValue}>{formatValue(readout.momentumMagnitude, 5)}</span></div>
            <div><span className={styles.scalarLabel}>T / U</span><span className={styles.scalarValue}>{formatValue(readout.kinetic)} / {formatValue(readout.potential)}</span></div>
          </div>

          <div className={styles.relationRegister} aria-label="Three strongest instantaneous pair forces">
            {readout.relations.map((relation, index) => (
              <div key={relation.id} className={styles.relation}>
                <span className={styles.relationLabel} style={{ color: PAIR_COLOURS[index] }}>{relation.label}</span>
                <span className={styles.relationValue}>r {formatValue(relation.distance, 5)}</span>
                <span className={styles.relationValue}>|F| {formatValue(relation.force, 5)}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
