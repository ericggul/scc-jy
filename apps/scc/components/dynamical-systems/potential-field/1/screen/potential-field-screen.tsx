"use client";

import { useEffect, useRef } from "react";
import { PotentialFieldScene } from "../rendering/potential-field-scene";
import styles from "../potential-field.module.css";

export default function PotentialFieldScreen() {
  const hostRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const scene = new PotentialFieldScene({
      host,
      canvas,
      onError: (error) => console.error("Potential-field WebGPU renderer failed.", error),
    });
    let dispose: (() => void) | undefined;
    let mounted = true;

    void scene.initialise().then((cleanup) => {
      if (!mounted) {
        cleanup?.();
        return;
      }
      dispose = cleanup;
    });

    return () => {
      mounted = false;
      dispose?.();
    };
  }, []);

  return (
    <main ref={hostRef} className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="A wireframe closed field containing seventy-two portrait spheres. The spheres move through the field, rebound from its inner boundary, and collide with one another. Drag to inspect and use the mouse wheel or pinch to zoom."
      />
    </main>
  );
}
