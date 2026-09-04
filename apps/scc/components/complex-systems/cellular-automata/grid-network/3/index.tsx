"use client";

import { useEffect, useRef } from "react";
import styles from "./grid-network.module.css";
import { createGridNetworkThreeRenderer } from "./rendering";

export default function GridNetworkThree() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return createGridNetworkThreeRenderer(canvas);
  }, []);

  return (
    <main className={styles.page}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="An 8 by 8 by 8 black and white cellular automaton. Background cubes evolve through six face neighbours and border cubes evolve through twelve edge-diagonal neighbours. Drag to orbit the volume. Press a cube, or use Enter or Space after selecting one, to change its background state."
        tabIndex={0}
      />
    </main>
  );
}
