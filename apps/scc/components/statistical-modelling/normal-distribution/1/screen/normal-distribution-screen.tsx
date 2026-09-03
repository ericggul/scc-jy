"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three/webgpu";
import {
  DEFAULT_NORMAL_DISTRIBUTION,
  type NormalDistributionParameters,
} from "../model/normal-distribution";
import NormalSurface from "../rendering/normal-surface";
import styles from "../normal-distribution.module.css";

type ParameterKey = keyof NormalDistributionParameters;

type Control = Readonly<{
  key: ParameterKey;
  label: string;
  min: number;
  max: number;
  step: number;
}>;

const CONTROLS: readonly Control[] = [
  { key: "mean", label: "μ", min: -1.8, max: 1.8, step: 0.05 },
  { key: "deviation", label: "σ", min: 0.5, max: 2.2, step: 0.05 },
  { key: "correlation", label: "ρ", min: -0.8, max: 0.8, step: 0.05 },
];

function formatValue(key: ParameterKey, value: number) {
  if (key === "mean" && value > 0) return `+${value.toFixed(2)}`;
  return value.toFixed(2);
}

export default function NormalDistributionScreen() {
  const [parameters, setParameters] = useState(DEFAULT_NORMAL_DISTRIBUTION);

  function setParameter(key: ParameterKey, value: number) {
    setParameters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section
      aria-label="Interactive bivariate normal distribution particle field"
      className={styles.field}
    >
      <Canvas
        className={styles.canvas}
        camera={{ fov: 37, position: [6.9, 4.7, 6.9] }}
        dpr={[1, 2]}
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
        <NormalSurface parameters={parameters} />
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={13}
          minDistance={3.7}
          target={[0, 0.1, 0]}
        />
      </Canvas>

      <form className={styles.controls} aria-label="Normal distribution parameters">
        <div className={styles.parameters}>
          {CONTROLS.map((control) => (
            <label className={styles.parameter} key={control.key}>
              <span>{control.label}</span>
              <input
                aria-label={`${control.label} parameter`}
                max={control.max}
                min={control.min}
                onChange={(event) => setParameter(control.key, Number(event.target.value))}
                step={control.step}
                type="range"
                value={parameters[control.key]}
              />
              <output>{formatValue(control.key, parameters[control.key])}</output>
            </label>
          ))}
        </div>
        <button
          className={styles.reset}
          onClick={(event) => {
            event.preventDefault();
            setParameters(DEFAULT_NORMAL_DISTRIBUTION);
          }}
          type="reset"
        >
          reset
        </button>
      </form>
    </section>
  );
}
