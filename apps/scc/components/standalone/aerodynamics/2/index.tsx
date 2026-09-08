"use client";

import { useMemo, useState } from "react";
import { ABC_REGIMES, type AbcRegime } from "./model/abc-flow";
import AbcHandCanvas from "./rendering/abc-hand-canvas";
import styles from "./screen/abc-hand-field.module.css";

export default function AerodynamicsTwo() {
  const [regime, setRegime] = useState<AbcRegime>(ABC_REGIMES[0]);
  const [playing, setPlaying] = useState(true);
  const coefficients = useMemo(() => ({ a: regime.a, b: regime.b, c: regime.c }), [regime]);
  return <main className={styles.field}>
    <AbcHandCanvas coefficients={coefficients} playing={playing} />
    <p className={styles.hint}>ABC flow · drag to rotate · scroll to zoom</p>
    <div className={styles.controls}>
      {ABC_REGIMES.map((option) => <button key={option.id} onClick={() => setRegime(option)} aria-pressed={option.id === regime.id}>{option.label}</button>)}
      <button onClick={() => setPlaying(!playing)} aria-pressed={!playing}>{playing ? "Pause" : "Resume"}</button>
    </div>
  </main>;
}
