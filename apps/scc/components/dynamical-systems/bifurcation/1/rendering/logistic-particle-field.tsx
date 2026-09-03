"use client";

import { extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  Fn,
  code,
  instanceIndex,
  instancedArray,
  uv,
  vec3,
  wgslFn,
} from "three/tsl";
import {
  LOGISTIC_MAP_INTERVAL_SECONDS,
  LOGISTIC_PARTICLE_COUNT,
  LOGISTIC_RESEED_ITERATIONS,
  LOGISTIC_SUSPENSION_CYCLE_TICKS,
} from "../model";

extend(THREE as never);

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

type LogisticParticleFieldProps = Readonly<{
  parameter: number;
  run: number;
}>;

function LogisticParticleFieldCore({ parameter }: Pick<LogisticParticleFieldProps, "parameter">) {
  const { gl: canvasRenderer } = useThree();
  const gl = canvasRenderer as unknown as THREE.WebGPURenderer;
  const isInitialised = useRef(false);
  const tickRemainder = useRef(0);

  const { nodes } = useMemo(() => {
    // spawn = (x0, 0, suspension phase) is immutable. The live state is
    // offset = (x[n] - x0, x[n - 1], x[n - 2]). Position lifts the discrete
    // map into a suspension: phase plus the actual return-map section.
    const spawnStates = instancedArray(LOGISTIC_PARTICLE_COUNT, "vec3");
    const offsetStates = instancedArray(LOGISTIC_PARTICLE_COUNT, "vec3");
    const lifeStates = instancedArray(LOGISTIC_PARTICLE_COUNT, "vec3");
    const spawnState = spawnStates.element(instanceIndex);
    const offsetState = offsetStates.element(instanceIndex);
    const lifeState = lifeStates.element(instanceIndex);

    const hash = code(`
      fn hash(index: u32) -> f32 {
        return fract(sin(f32(index) * 12.9898) * 43758.5453);
      }
    `);

    const initialise = wgslFn(
      `
        fn initialiseDelayEmbedding(
          spawnStates: ptr<storage, array<vec3f>, read_write>,
          offsetStates: ptr<storage, array<vec3f>, read_write>,
          lifeStates: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let seed = 0.04 + hash(index + 17u) * 0.92;
          let age = index % ${LOGISTIC_RESEED_ITERATIONS}u;
          var current = seed;
          var previous = seed;
          var beforePrevious = seed;

          for (var iteration = 0u; iteration < age; iteration = iteration + 1u) {
            let next = ${parameter} * current * (1.0 - current);
            beforePrevious = previous;
            previous = current;
            current = next;
          }

          spawnStates[index] = vec3f(seed, 0.0, hash(index + 31u));
          offsetStates[index] = vec3f(current - seed, previous, beforePrevious);
          lifeStates[index] = vec3f(f32(age), 0.0, 0.0);
        }
      `,
      [hash],
    );

    const update = wgslFn(`
      fn advanceDelayEmbedding(
        spawnStates: ptr<storage, array<vec3f>, read_write>,
        offsetStates: ptr<storage, array<vec3f>, read_write>,
        lifeStates: ptr<storage, array<vec3f>, read_write>,
        index: u32
      ) -> void {
        let spawn = spawnStates[index];
        let offset = offsetStates[index];
        let age = u32(lifeStates[index].x) + 1u;

        if (age >= ${LOGISTIC_RESEED_ITERATIONS}u) {
          offsetStates[index] = vec3f(0.0, spawn.x, spawn.x);
          lifeStates[index] = vec3f(0.0);
        } else {
          let current = spawn.x + offset.x;
          let next = ${parameter} * current * (1.0 - current);
          offsetStates[index] = vec3f(next - spawn.x, current, offset.y);
          lifeStates[index] = vec3f(f32(age), 0.0, 0.0);
        }
      }
    `);

    const initialiseNode = initialise({
      spawnStates,
      offsetStates,
      lifeStates,
      index: instanceIndex,
    }).compute(LOGISTIC_PARTICLE_COUNT);
    const updateNode = update({
      spawnStates,
      offsetStates,
      lifeStates,
      index: instanceIndex,
    }).compute(LOGISTIC_PARTICLE_COUNT);

    const current = spawnState.x.add(offsetState.x);
    const suspensionAngle = spawnState.z
      .mul(Math.PI * 2)
      .add(lifeState.x.mul((Math.PI * 2) / LOGISTIC_SUSPENSION_CYCLE_TICKS));
    const radialDistance = current.sub(0.5).mul(2.4).add(3.0);
    const positionNode = Fn(() => vec3(
      radialDistance.mul(suspensionAngle.cos()),
      offsetState.y.sub(0.5).mul(4.6),
      radialDistance.mul(suspensionAngle.sin()),
    ))();

    const scaleNode = wgslFn(
      `
        fn particleScale(index: u32, life: vec3f) -> f32 {
          let settled = smoothstep(190.0, 250.0, life.x);
          let incomingScale = 0.008 + hash(index + 71u) * 0.012;
          let settledScale = 0.028 + hash(index + 71u) * 0.044;
          return mix(incomingScale, settledScale, settled);
        }
      `,
      [hash],
    )({ index: instanceIndex, life: lifeState });

    const colorNode = wgslFn(`
      fn returnMapColor(
        delayState: vec3f,
        life: vec3f,
        coord: vec2f
      ) -> vec4f {
        let settled = smoothstep(190.0, 250.0, life.x);
        let variation = distance(delayState, vec3f(0.0, 0.5, 0.5));
        let deepBlue = vec3f(0.10, 0.34, 1.0);
        let warmGold = vec3f(1.0, 0.46, 0.12);
        let base = mix(warmGold, deepBlue, smoothstep(0.15, 0.9, variation));
        let distanceFromCenter = distance(coord, vec2f(0.5));
        let circle = smoothstep(0.5, 0.42, distanceFromCenter);
        let fill = max(1.0 - distanceFromCenter * 2.0, 0.0);
        let opacity = mix(0.065, 0.96, settled) * circle;

        return vec4f(base * fill * circle, opacity);
      }
    `)({ delayState: offsetState, life: lifeState, coord: uv() });

    return {
      nodes: { colorNode, initialiseNode, positionNode, scaleNode, updateNode },
    };
  }, [parameter]);

  const initialise = useCallback(async () => {
    try {
      await gl.computeAsync(nodes.initialiseNode);
      isInitialised.current = true;
    } catch (error) {
      console.error(error);
    }
  }, [gl, nodes.initialiseNode]);

  useEffect(() => {
    isInitialised.current = false;
    void initialise();
  }, [initialise]);

  useFrame((frameState, delta) => {
    if (!isInitialised.current) return;
    tickRemainder.current += delta;
    if (tickRemainder.current < LOGISTIC_MAP_INTERVAL_SECONDS) return;

    tickRemainder.current %= LOGISTIC_MAP_INTERVAL_SECONDS;
    const renderer = frameState.gl as unknown as THREE.WebGPURenderer;
    renderer.compute(nodes.updateNode);
  });

  return (
    <sprite count={LOGISTIC_PARTICLE_COUNT}>
      <spriteNodeMaterial
        blending={THREE.AdditiveBlending}
        colorNode={nodes.colorNode as never}
        depthWrite={false}
        positionNode={nodes.positionNode as never}
        scaleNode={nodes.scaleNode as never}
        transparent
      />
    </sprite>
  );
}

export function LogisticParticleField({ parameter, run }: LogisticParticleFieldProps) {
  return <LogisticParticleFieldCore key={`${parameter}-${run}`} parameter={parameter} />;
}
