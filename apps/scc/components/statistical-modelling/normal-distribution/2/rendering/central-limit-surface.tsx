"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CENTRAL_LIMIT_PARTICLE_COUNT,
  CENTRAL_LIMIT_STEPS,
  CENTRAL_LIMIT_BASE_HEIGHT,
  createCentralLimitField,
  type CentralLimitParameters,
} from "../model/central-limit-histogram";

const ACCUMULATION_DURATION = 4.65;
const FINAL_DELAY = 2.65;
const TAIL_COLOR = [0.12, 0.34, 0.78] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function ease(value: number) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export default function CentralLimitSurface({
  parameters,
  sampleRun,
  onSettled,
}: Readonly<{
  parameters: CentralLimitParameters;
  sampleRun: number;
  onSettled: () => void;
}>) {
  const { correlation, deviation, mean } = parameters;
  const elapsed = useRef(0);
  const settled = useRef(false);
  const { field, geometry } = useMemo(() => {
    const parameterSeed = Math.round(
      (mean + 2) * 10_000 + deviation * 1_000 + (correlation + 1) * 100,
    );
    const nextField = createCentralLimitField(
      { correlation, deviation, mean },
      (0x42b6d0f1 + sampleRun * 31 + parameterSeed) >>> 0,
    );
    const positions = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT * 3);
    for (let particle = 0; particle < CENTRAL_LIMIT_PARTICLE_COUNT; particle += 1) {
      const offset = particle * 3;
      const firstStep = particle * CENTRAL_LIMIT_STEPS * 2;
      positions[offset] = nextField.trajectories[firstStep] ?? 0;
      positions[offset + 1] = CENTRAL_LIMIT_BASE_HEIGHT;
      positions[offset + 2] = nextField.trajectories[firstStep + 1] ?? 0;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const initialColors = new Float32Array(CENTRAL_LIMIT_PARTICLE_COUNT * 3);
    for (let particle = 0; particle < CENTRAL_LIMIT_PARTICLE_COUNT; particle += 1) {
      const offset = particle * 3;
      initialColors[offset] = TAIL_COLOR[0];
      initialColors[offset + 1] = TAIL_COLOR[1];
      initialColors[offset + 2] = TAIL_COLOR[2];
    }
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(initialColors, 3));
    nextGeometry.computeBoundingSphere();
    return { field: nextField, geometry: nextGeometry };
  }, [correlation, deviation, mean, sampleRun]);

  useEffect(() => {
    elapsed.current = 0;
    settled.current = false;
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((_, delta) => {
    if (settled.current) return;

    elapsed.current += Math.min(delta, 0.05);
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const positions = position.array as Float32Array;
    const color = geometry.getAttribute("color") as THREE.BufferAttribute;
    const colors = color.array as Float32Array;

    for (let particle = 0; particle < CENTRAL_LIMIT_PARTICLE_COUNT; particle += 1) {
      const offset = particle * 3;
      const pathOffset = particle * CENTRAL_LIMIT_STEPS * 2;
      const progress = clamp(
        (elapsed.current - (field.delays[particle] ?? 0)) / ACCUMULATION_DURATION,
        0,
        1,
      );
      const scaledStep = progress * (CENTRAL_LIMIT_STEPS - 1);
      const step = Math.min(Math.floor(scaledStep), CENTRAL_LIMIT_STEPS - 1);
      const nextStep = Math.min(step + 1, CENTRAL_LIMIT_STEPS - 1);
      const betweenSteps = scaledStep - step;
      const from = pathOffset + step * 2;
      const to = pathOffset + nextStep * 2;
      const rawX = interpolate(
        field.trajectories[from] ?? 0,
        field.trajectories[to] ?? 0,
        betweenSteps,
      );
      const rawZ = interpolate(
        field.trajectories[from + 1] ?? 0,
        field.trajectories[to + 1] ?? 0,
        betweenSteps,
      );
      const accumulated = ease(progress);

      positions[offset] = rawX;
      positions[offset + 1] = interpolate(
        CENTRAL_LIMIT_BASE_HEIGHT,
        field.finalPositions[offset + 1] ?? CENTRAL_LIMIT_BASE_HEIGHT,
        accumulated,
      );
      positions[offset + 2] = rawZ;
      colors[offset] = interpolate(TAIL_COLOR[0], field.colors[offset] ?? TAIL_COLOR[0], accumulated);
      colors[offset + 1] = interpolate(TAIL_COLOR[1], field.colors[offset + 1] ?? TAIL_COLOR[1], accumulated);
      colors[offset + 2] = interpolate(TAIL_COLOR[2], field.colors[offset + 2] ?? TAIL_COLOR[2], accumulated);
    }

    position.needsUpdate = true;
    color.needsUpdate = true;
    if (elapsed.current < ACCUMULATION_DURATION + FINAL_DELAY) return;

    settled.current = true;
    onSettled();
  });

  return (
    <points frustumCulled={false} geometry={geometry}>
      <pointsMaterial
        depthWrite={false}
        opacity={0.98}
        size={0.068}
        sizeAttenuation
        transparent
        vertexColors
      />
    </points>
  );
}
