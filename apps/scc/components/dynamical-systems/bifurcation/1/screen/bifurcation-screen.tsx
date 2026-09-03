"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three/webgpu";
import {
  LOGISTIC_BIFURCATION_STAGES,
  LOGISTIC_STAGE_DURATION_MS,
} from "../model";
import { LogisticParticleField } from "../rendering/logistic-particle-field";
import styles from "../bifurcation.module.css";

function formatParameter(value: number) {
  return value.toFixed(3);
}

export default function BifurcationScreen() {
  const [stageIndex, setStageIndex] = useState(0);
  const [run, setRun] = useState(0);
  const stage = LOGISTIC_BIFURCATION_STAGES[stageIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % LOGISTIC_BIFURCATION_STAGES.length);
      setRun((current) => current + 1);
    }, LOGISTIC_STAGE_DURATION_MS);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.field} aria-label="Logistic-map bifurcation delay-state particle field">
      <Canvas
        className={styles.canvas}
        camera={{ fov: 42, position: [5.2, 3.1, 6.5] }}
        dpr={[1, 2]}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(
            props as unknown as THREE.WebGPURendererParameters,
          );
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense>
          <color attach="background" args={["#05070d"]} />
          <LogisticParticleField parameter={stage.parameter} run={run} />
          <OrbitControls
            enableDamping
            enablePan={false}
            maxDistance={16}
            minDistance={4.4}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>

      <output
        className={styles.parameter}
        aria-label={`Logistic-map parameter r equals ${formatParameter(stage.parameter)}`}
      >
        <span aria-hidden="true">r</span>
        {formatParameter(stage.parameter)}
      </output>
    </section>
  );
}
