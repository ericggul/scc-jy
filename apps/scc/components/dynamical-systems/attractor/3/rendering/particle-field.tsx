import { extend, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
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
import { v4 as uuidv4 } from "uuid";
import type { ParticleSystem } from "../model/particle-systems";

extend(THREE as never);

export const PARTICLE_COUNT = 30_000;

declare module "@react-three/fiber" {
  interface ThreeElements {
    spriteNodeMaterial: import("@react-three/fiber").ThreeElement<
      typeof THREE.SpriteNodeMaterial
    >;
  }
}

type ParticleFieldProps = Readonly<{
  system: ParticleSystem;
}>;

function ParticleFieldCore({ system }: ParticleFieldProps) {
  const { gl: canvasRenderer } = useThree();
  const gl = canvasRenderer as unknown as THREE.WebGPURenderer;

  const { nodes } = useMemo(() => {
    const spawnPositionsBuffer = instancedArray(PARTICLE_COUNT, "vec3");
    const offsetPositionsBuffer = instancedArray(PARTICLE_COUNT, "vec3");
    const spawnPosition = spawnPositionsBuffer.element(instanceIndex);
    const offsetPosition = offsetPositionsBuffer.element(instanceIndex);
    const [seedX, seedY, seedZ] = system.seedCenter;
    const [viewX, viewY, viewZ] = system.viewCenter;
    const seedRadiusSquared = system.seedRadius ** 2;

    const hash = code(`
      fn hash(index: u32) -> f32 {
        return fract(sin(f32(index) * 12.9898) * 43758.5453);
      }
    `);

    const computeInitWgsl = wgslFn(
      `
        fn computeInit(
          spawnPositions: ptr<storage, array<vec3f>, read_write>,
          offsetPositions: ptr<storage, array<vec3f>, read_write>,
          index: u32
        ) -> void {
          let h0 = hash(index);
          let h1 = hash(index + 1u);
          let h2 = hash(index + 2u);

          let distance = sqrt(h0 * ${seedRadiusSquared});
          let theta = h1 * 6.28318530718;
          let phi = h2 * 3.14159265359;

          let x = ${seedX} + distance * sin(phi) * cos(theta);
          let y = ${seedY} + distance * sin(phi) * sin(theta);
          let z = ${seedZ} + distance * cos(phi);

          spawnPositions[index] = vec3f(x, y, z);
          offsetPositions[index] = vec3f(0.0);
        }
      `,
      [hash],
    );

    const computeNode = computeInitWgsl({
      spawnPositions: spawnPositionsBuffer,
      offsetPositions: offsetPositionsBuffer,
      index: instanceIndex,
    }).compute(PARTICLE_COUNT);

    const attractorDerivative = wgslFn(system.derivativeWgsl);
    const computeNodeUpdate = Fn(() => {
      const derivative = attractorDerivative({
        pos: spawnPosition.add(offsetPosition),
      }) as ReturnType<typeof spawnPosition.add>;
      offsetPosition.addAssign(derivative.mul(system.step));
    })().compute(PARTICLE_COUNT);

    const positionNode = Fn(() => spawnPosition
      .add(offsetPosition)
      .sub(vec3(viewX, viewY, viewZ))
      .div(system.viewScale))();

    const scaleNode = wgslFn(
      `
        fn scaleNode() -> f32 {
          return randValue(0.01, 0.04, 3u);
        }

        fn randValue(min: f32, max: f32, seed: u32) -> f32 {
          return hash(seed) * (max - min) + min;
        }
      `,
      [hash],
    )();

    const particleColor = wgslFn(`
      fn colorNode(position: vec3f, uvCoord: vec2f) -> vec4f {
        let cool = vec3f(0.24, 0.43, 0.96);
        let distanceToCenter = min(distance(position, vec3f(0.0)), 1.35);
        let strength = distance(uvCoord, vec2f(0.5));
        let distColor = mix(vec3f(0.97, 0.7, 0.45), cool, distanceToCenter);
        let fillMask = 1.0 - strength * 2.0;
        let circle = smoothstep(0.5, 0.49, strength);
        return vec4f(distColor * fillMask * circle, 1.0);
      }
    `);

    const colorNode = particleColor({
      position: positionNode,
      uvCoord: uv(),
    });

    return {
      nodes: {
        colorNode,
        computeNode,
        computeNodeUpdate,
        positionNode,
        scaleNode,
      },
    };
  }, [system]);

  const initialise = useCallback(async () => {
    try {
      await gl.computeAsync(nodes.computeNode);
    } catch (error) {
      console.error(error);
    }
  }, [gl, nodes.computeNode]);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  useFrame((state) => {
    const renderer = state.gl as unknown as THREE.WebGPURenderer;
    for (let step = 0; step < system.substeps; step += 1) {
      renderer.compute(nodes.computeNodeUpdate);
    }
  });

  return (
    <sprite count={PARTICLE_COUNT}>
      <spriteNodeMaterial
        key={uuidv4()}
        colorNode={nodes.colorNode as never}
        positionNode={nodes.positionNode as never}
        scaleNode={nodes.scaleNode as never}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

export function ParticleField({ system }: ParticleFieldProps) {
  return <ParticleFieldCore key={system.id} system={system} />;
}
