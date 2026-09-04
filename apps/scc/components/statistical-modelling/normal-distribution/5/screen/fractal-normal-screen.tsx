"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import FractalNormalTerrain from "../rendering/fractal-normal-terrain";
import styles from "../fractal-normal.module.css";

export default function FractalNormalScreen() {
  return (
    <section
      aria-label="Four hundred normal-distribution mountains arranged as a circular spiral and scaled by a larger normal distribution"
      className={styles.field}
    >
      <Canvas
        className={styles.canvas}
        camera={{ fov: 37, position: [58.6, 40, 58.6] }}
        dpr={1}
        frameloop="demand"
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(
            props as unknown as THREE.WebGPURendererParameters,
          );
          await renderer.init();
          return renderer;
        }}
      >
        <color attach="background" args={["#070a10"]} />
        <hemisphereLight args={["#9ab4ff", "#04050c", 1.35]} />
        <directionalLight color="#ffe0bb" intensity={2.4} position={[-7, 11, 6]} />
        <directionalLight color="#6d91ff" intensity={0.9} position={[8, 5, -7]} />
        <FractalNormalTerrain />
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={112}
          minDistance={31}
          target={[0, 0.85, 0]}
        />
      </Canvas>
    </section>
  );
}
