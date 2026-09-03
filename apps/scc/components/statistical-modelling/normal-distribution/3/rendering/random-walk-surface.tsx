"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  createRandomWalkField,
  RANDOM_WALKER_COUNT,
  RANDOM_WALK_STEPS,
  RANDOM_WALK_TRACE_COUNT,
  randomWalkTrajectoryOffset,
  type RandomWalkParameters,
} from "../model/random-walk-field";

const WALK_DURATION = 5.65;
const WALKER_STAGGER = 1.1;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function pathCoordinate(
  trajectories: Float32Array,
  walker: number,
  step: number,
  coordinate: 0 | 1 | 2,
) {
  return trajectories[randomWalkTrajectoryOffset(walker, step) + coordinate] ?? 0;
}

export default function RandomWalkSurface({
  parameters,
  sampleRun,
  onSettled,
}: Readonly<{
  parameters: RandomWalkParameters;
  sampleRun: number;
  onSettled: () => void;
}>) {
  const { correlation, deviation, mean } = parameters;
  const elapsed = useRef(0);
  const settled = useRef(false);
  const { field, pointGeometry, traceGeometry } = useMemo(() => {
    const parameterSeed = Math.round(
      (mean + 2) * 10_000 + deviation * 1_000 + (correlation + 1) * 100,
    );
    const nextField = createRandomWalkField(
      { correlation, deviation, mean },
      (0x8cf2d7b1 + sampleRun * 31 + parameterSeed) >>> 0,
    );
    const pointPositions = new Float32Array(RANDOM_WALKER_COUNT * 3);

    for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
      const offset = walker * 3;
      pointPositions[offset] = pathCoordinate(nextField.trajectories, walker, 0, 0);
      pointPositions[offset + 1] = pathCoordinate(nextField.trajectories, walker, 0, 1);
      pointPositions[offset + 2] = pathCoordinate(nextField.trajectories, walker, 0, 2);
    }

    const nextPointGeometry = new THREE.BufferGeometry();
    nextPointGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    nextPointGeometry.computeBoundingSphere();

    const tracePositions = new Float32Array(RANDOM_WALK_TRACE_COUNT * RANDOM_WALK_STEPS * 6);
    for (let trace = 0; trace < RANDOM_WALK_TRACE_COUNT; trace += 1) {
      const walker = nextField.traceIndices[trace] ?? 0;
      const originX = pathCoordinate(nextField.trajectories, walker, 0, 0);
      const originY = pathCoordinate(nextField.trajectories, walker, 0, 1);
      const originZ = pathCoordinate(nextField.trajectories, walker, 0, 2);
      for (let step = 0; step < RANDOM_WALK_STEPS; step += 1) {
        const offset = (trace * RANDOM_WALK_STEPS + step) * 6;
        tracePositions[offset] = originX;
        tracePositions[offset + 1] = originY;
        tracePositions[offset + 2] = originZ;
        tracePositions[offset + 3] = originX;
        tracePositions[offset + 4] = originY;
        tracePositions[offset + 5] = originZ;
      }
    }
    const nextTraceGeometry = new THREE.BufferGeometry();
    nextTraceGeometry.setAttribute("position", new THREE.BufferAttribute(tracePositions, 3));
    nextTraceGeometry.computeBoundingSphere();

    return { field: nextField, pointGeometry: nextPointGeometry, traceGeometry: nextTraceGeometry };
  }, [correlation, deviation, mean, sampleRun]);

  useEffect(() => {
    elapsed.current = 0;
    settled.current = false;
    return () => {
      pointGeometry.dispose();
      traceGeometry.dispose();
    };
  }, [pointGeometry, traceGeometry]);

  useFrame((_, delta) => {
    if (settled.current) return;

    elapsed.current += Math.min(delta, 0.05);
    const pointPosition = pointGeometry.getAttribute("position") as THREE.BufferAttribute;
    const pointPositions = pointPosition.array as Float32Array;
    const tracePosition = traceGeometry.getAttribute("position") as THREE.BufferAttribute;
    const tracePositions = tracePosition.array as Float32Array;

    for (let walker = 0; walker < RANDOM_WALKER_COUNT; walker += 1) {
      const delay = field.delays[walker] ?? 0;
      const progress = clamp((elapsed.current - delay) / WALK_DURATION, 0, 1);
      const scaledStep = progress * RANDOM_WALK_STEPS;
      const step = Math.min(Math.floor(scaledStep), RANDOM_WALK_STEPS - 1);
      const nextStep = Math.min(step + 1, RANDOM_WALK_STEPS);
      const betweenSteps = scaledStep - step;
      const offset = walker * 3;

      for (const coordinate of [0, 1, 2] as const) {
        pointPositions[offset + coordinate] = interpolate(
          pathCoordinate(field.trajectories, walker, step, coordinate),
          pathCoordinate(field.trajectories, walker, nextStep, coordinate),
          betweenSteps,
        );
      }
    }

    for (let trace = 0; trace < RANDOM_WALK_TRACE_COUNT; trace += 1) {
      const walker = field.traceIndices[trace] ?? 0;
      const delay = field.delays[walker] ?? 0;
      const pathProgress = clamp((elapsed.current - delay) / WALK_DURATION, 0, 1);
      const availableStep = pathProgress * RANDOM_WALK_STEPS;

      for (let step = 0; step < RANDOM_WALK_STEPS; step += 1) {
        const segmentProgress = clamp(availableStep - step, 0, 1);
        const offset = (trace * RANDOM_WALK_STEPS + step) * 6;
        for (const coordinate of [0, 1, 2] as const) {
          const start = pathCoordinate(field.trajectories, walker, step, coordinate);
          tracePositions[offset + coordinate] = start;
          tracePositions[offset + 3 + coordinate] = interpolate(
            start,
            pathCoordinate(field.trajectories, walker, step + 1, coordinate),
            segmentProgress,
          );
        }
      }
    }

    pointPosition.needsUpdate = true;
    tracePosition.needsUpdate = true;

    if (elapsed.current < WALKER_STAGGER + WALK_DURATION) return;
    settled.current = true;
    onSettled();
  });

  return (
    <>
      <lineSegments frustumCulled={false} geometry={traceGeometry}>
        <lineBasicMaterial
          color="#737fae"
          depthWrite={false}
          opacity={0.28}
          transparent
        />
      </lineSegments>
      <points frustumCulled={false} geometry={pointGeometry}>
        <pointsMaterial
          color="#d5dcfb"
          depthWrite={false}
          opacity={0.7}
          size={0.065}
          sizeAttenuation
          transparent
        />
      </points>
    </>
  );
}
