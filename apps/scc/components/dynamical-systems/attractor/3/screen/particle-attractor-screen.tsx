"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import * as THREE from "three/webgpu";
import {
  PARTICLE_SYSTEMS,
  type ParticleSystemId,
} from "../model/particle-systems";
import { ParticleField } from "../rendering/particle-field";
import styles from "../attractor-field.module.css";

export default function ParticleAttractorScreen() {
  const [activeSystemId, setActiveSystemId] = useState<ParticleSystemId>(
    "thomas",
  );
  const activeSystem = PARTICLE_SYSTEMS.find(
    (system) => system.id === activeSystemId,
  ) ?? PARTICLE_SYSTEMS[0];

  return (
    <section className={styles.field} aria-label="GPU attractor particle field">
      <Canvas
        className={styles.canvas}
        shadows
        camera={{ position: [-4, 3, 4] }}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(
            props as unknown as THREE.WebGPURendererParameters,
          );
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense>
          <color attach="background" args={["#000000"]} />
          <OrbitControls />
          <ParticleField system={activeSystem} />
        </Suspense>
      </Canvas>
      <nav className={styles.systems} aria-label="Particle attractor systems">
        {PARTICLE_SYSTEMS.map((system) => (
          <button
            key={system.id}
            aria-pressed={system.id === activeSystem.id}
            className={styles.systemButton}
            onClick={() => setActiveSystemId(system.id)}
            type="button"
          >
            {system.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
