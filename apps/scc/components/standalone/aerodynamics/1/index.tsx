"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import { ABC_REGIMES, type AbcRegime } from "./model/abc-flow";
import AbcField from "./rendering/abc-field";
import styles from "./screen/abc-field.module.css";

export default function Aerodynamics() {
  const [regime, setRegime] = useState<AbcRegime>(ABC_REGIMES[0]);
  const [playing, setPlaying] = useState(true);
  const coefficients = useMemo(
    () => ({ a: regime.a, b: regime.b, c: regime.c }),
    [regime],
  );
  return <main className={styles.field}>
    <Canvas
      frameloop="demand"
      dpr={1}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [7.8, 6.2, 8.4], fov: 44, near: 0.1, far: 50 }}
      aria-label="Arnold-Beltrami-Childress flow. Thousands of three-dimensional arrows advect through a periodic Euler velocity field. Drag to rotate; scroll to zoom."
    >
      <color attach="background" args={["#060712"]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#c8d5ff" />
      <directionalLight position={[-4, -2, 2]} intensity={1.1} color="#ffbb86" />
      <AbcField coefficients={coefficients} playing={playing} />
      <OrbitControls enableDamping={false} enablePan={false} minDistance={5.5} maxDistance={19} />
    </Canvas>
    <p className={styles.hint}>ABC flow · drag to rotate · scroll to zoom</p>
    <div className={styles.controls}>
      {ABC_REGIMES.map((option) => <button key={option.id} onClick={() => setRegime(option)} aria-pressed={option.id === regime.id}>{option.label}</button>)}
      <button onClick={() => setPlaying(!playing)} aria-pressed={!playing}>{playing ? "Pause" : "Resume"}</button>
    </div>
  </main>;
}
