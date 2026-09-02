"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./void-field.module.css";
import {
  createVoidParticleField,
  particleCountForViewport,
  type VoidParticleField,
  type VoidParticleParameters,
} from "./rendering/particle-field";

const MIN_NOISE = 0;
const MAX_NOISE = Math.PI;
const MIN_INTERACTION_RADIUS = 0.024;
const MAX_INTERACTION_RADIUS = 0.06;
const MIN_ATTRACTION_GAIN = 0.25;
const MAX_ATTRACTION_GAIN = 2.4;

const INITIAL_PARAMETERS: VoidParticleParameters = {
  attractionGain: 1,
  interactionRadius: 0.037,
  noise: 0.42,
};

export default function VoidThree() {
  const fieldRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleFieldRef = useRef<VoidParticleField | null>(null);
  const parametersRef = useRef(INITIAL_PARAMETERS);
  const [parameters, setParameters] = useState(INITIAL_PARAMETERS);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let initializationVersion = 0;
    let pendingParticleCount: number | null = null;
    let resizeFrameId: number | null = null;

    const initialize = async (bounds: DOMRect) => {
      const version = ++initializationVersion;
      pendingParticleCount = particleCountForViewport(bounds.width, bounds.height);
      particleFieldRef.current?.dispose();
      particleFieldRef.current = null;

      try {
        const particleField = await createVoidParticleField(
          canvas,
          parametersRef.current,
          bounds.width,
          bounds.height,
        );
        if (disposed || version !== initializationVersion) {
          particleField.dispose();
          return;
        }
        particleFieldRef.current = particleField;
        particleField.setParameters(parametersRef.current);
        const currentBounds = field.getBoundingClientRect();
        particleField.resize(currentBounds.width, currentBounds.height);
        particleField.setMotionReduced(reducedMotion.matches);
      } catch (error) {
        if (!disposed && version === initializationVersion) {
          console.error("Unable to initialize void/3's WebGPU particle field.", error);
        }
      } finally {
        if (version === initializationVersion) pendingParticleCount = null;
      }
    };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      const particleField = particleFieldRef.current;
      if (
        particleField &&
        particleField.particleCount ===
          particleCountForViewport(bounds.width, bounds.height)
      ) {
        particleField.resize(bounds.width, bounds.height);
      } else if (
        pendingParticleCount !==
        particleCountForViewport(bounds.width, bounds.height)
      ) {
        void initialize(bounds);
      }
    };

    const requestResize = () => {
      if (resizeFrameId !== null) return;
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = null;
        resize();
      });
    };

    const observer = new ResizeObserver(requestResize);
    observer.observe(field);

    const syncMotionPreference = () => {
      particleFieldRef.current?.setMotionReduced(reducedMotion.matches);
    };
    reducedMotion.addEventListener("change", syncMotionPreference);

    void initialize(field.getBoundingClientRect());

    return () => {
      disposed = true;
      initializationVersion += 1;
      observer.disconnect();
      reducedMotion.removeEventListener("change", syncMotionPreference);
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
      particleFieldRef.current?.dispose();
      particleFieldRef.current = null;
    };
  }, []);

  const updateParameters = (next: VoidParticleParameters) => {
    parametersRef.current = next;
    particleFieldRef.current?.setParameters(next);
    setParameters(next);
  };

  return (
    <main ref={fieldRef} className={styles.field}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.controlDock}>
        <section
          id="void-controls"
          className={styles.controlPanel}
          aria-label="Attractive Vicsek field parameters"
          hidden={!controlsExpanded}
        >
          <label className={styles.parameter} htmlFor="void-noise">
            <span>noise</span>
            <input
              id="void-noise"
              className={styles.slider}
              type="range"
              min={MIN_NOISE}
              max={MAX_NOISE}
              step="0.01"
              value={parameters.noise}
              onChange={(event) =>
                updateParameters({
                  ...parameters,
                  noise: Number(event.target.value),
                })
              }
            />
            <output htmlFor="void-noise">{parameters.noise.toFixed(2)}</output>
          </label>
          <label className={styles.parameter} htmlFor="void-reach">
            <span>reach</span>
            <input
              id="void-reach"
              className={styles.slider}
              type="range"
              min={MIN_INTERACTION_RADIUS}
              max={MAX_INTERACTION_RADIUS}
              step="0.001"
              value={parameters.interactionRadius}
              onChange={(event) =>
                updateParameters({
                  ...parameters,
                  interactionRadius: Number(event.target.value),
                })
              }
            />
            <output htmlFor="void-reach">
              {parameters.interactionRadius.toFixed(3)}
            </output>
          </label>
          <label className={styles.parameter} htmlFor="void-attractivity">
            <span>attract.</span>
            <input
              id="void-attractivity"
              className={styles.slider}
              type="range"
              min={MIN_ATTRACTION_GAIN}
              max={MAX_ATTRACTION_GAIN}
              step="0.01"
              value={parameters.attractionGain}
              onChange={(event) =>
                updateParameters({
                  ...parameters,
                  attractionGain: Number(event.target.value),
                })
              }
            />
            <output htmlFor="void-attractivity">
              {parameters.attractionGain.toFixed(2)}
            </output>
          </label>
          <p className={styles.reading}>
            line weight = proximity × mutual attractivity
          </p>
          <button
            className={styles.stepButton}
            type="button"
            onClick={() => particleFieldRef.current?.step()}
          >
            advance
          </button>
        </section>
        <button
          className={styles.expandButton}
          type="button"
          aria-controls="void-controls"
          aria-expanded={controlsExpanded}
          onClick={() => setControlsExpanded((current) => !current)}
        >
          {controlsExpanded ? "close" : "adjust"}
        </button>
      </div>
    </main>
  );
}
