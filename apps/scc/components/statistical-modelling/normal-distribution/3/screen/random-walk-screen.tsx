"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three/webgpu";
import {
  DEFAULT_RANDOM_WALK_PARAMETERS,
  type RandomWalkParameters,
} from "../model/random-walk-field";
import styles from "../random-walk.module.css";
import RandomWalkSurface from "../rendering/random-walk-surface";

type ParameterKey = keyof RandomWalkParameters;

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

export default function RandomWalkScreen() {
  const [parameters, setParameters] = useState(DEFAULT_RANDOM_WALK_PARAMETERS);
  const [sampleRun, setSampleRun] = useState(0);
  const [isSettled, setIsSettled] = useState(false);

  function redraw() {
    setIsSettled(false);
    setSampleRun((current) => current + 1);
  }

  function setParameter(key: ParameterKey, value: number) {
    setParameters((current) => ({ ...current, [key]: value }));
    redraw();
  }

  return (
    <section
      aria-label="A three-dimensional random-walk field approaching a trivariate normal distribution"
      className={styles.field}
    >
      <Canvas
        className={styles.canvas}
        camera={{ fov: 37, position: [7.8, 5.8, 7.8] }}
        dpr={[1, 2]}
        frameloop={isSettled ? "demand" : "always"}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(
            props as unknown as THREE.WebGPURendererParameters,
          );
          await renderer.init();
          return renderer;
        }}
      >
        <color attach="background" args={["#070a10"]} />
        <RandomWalkSurface
          onSettled={() => setIsSettled(true)}
          parameters={parameters}
          sampleRun={sampleRun}
        />
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={14}
          minDistance={4.3}
          target={[0, 0, 0]}
        />
      </Canvas>

      <form className={styles.controls} aria-label="Random-walk distribution parameters">
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
        <div className={styles.actions}>
          <button className={styles.draw} onClick={redraw} type="button">
            draw walk
          </button>
          <button
            className={styles.reset}
            onClick={(event) => {
              event.preventDefault();
              setParameters(DEFAULT_RANDOM_WALK_PARAMETERS);
              redraw();
            }}
            type="reset"
          >
            reset
          </button>
        </div>
      </form>
    </section>
  );
}
