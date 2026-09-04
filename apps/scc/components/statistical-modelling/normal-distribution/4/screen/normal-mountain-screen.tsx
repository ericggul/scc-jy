"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import NormalMountainTerrain from "../rendering/normal-mountain-terrain";
import styles from "../normal-mountain.module.css";

export default function NormalMountainScreen() {
  return (
    <section
      aria-label="Four hundred connected normal-distribution mounts across a twenty-by-twenty plane"
      className={styles.field}
    >
      <Canvas
        className={styles.canvas}
        camera={{ fov: 35, position: [53.2, 46.9, 53.2] }}
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
        <NormalMountainTerrain />
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={92}
          minDistance={26}
          target={[0, 0.15, 0]}
        />
      </Canvas>
    </section>
  );
}
