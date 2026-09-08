"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./barrier.module.css";

export default function BarrierDefault() {
  const [amount, setAmount] = useState(0);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const formulaVisible = amount >= 85;
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!previous.current) return;
    const distance = Math.hypot(event.clientX - previous.current.x, event.clientY - previous.current.y);
    const width = event.currentTarget.clientWidth;
    previous.current = { x: event.clientX, y: event.clientY };
    setAmount((value) => Math.min(100, value + distance / Math.max(1, width) * 95));
  };
  return (
    <main className={styles.page} style={{ "--progress": amount / 100 } as CSSProperties}>
      <div className={styles.redField} aria-hidden="true" />
      <div className={styles.productImage} aria-hidden="true" />
      <div className={styles.wash} aria-hidden="true" />
      <div className={styles.surface} aria-hidden="true" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); previous.current = { x: event.clientX, y: event.clientY }; }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event); }} onPointerUp={() => { previous.current = null; }} onPointerCancel={() => { previous.current = null; }} onLostPointerCapture={() => { previous.current = null; }} />
      <div className={styles.productLabel} aria-hidden="true"><strong>M/3</strong><span>BARRIER CREAM</span><small>CERAMIDE · CHOLESTEROL · FATTY ACID<br />50 mL / 1.69 FL.OZ.</small></div>
      <h1 className={styles.copy}><span>장벽을 생각한다면</span><span>세라마이드 하나만으로</span><span>끝내면 안 됩니다.</span></h1>
      <p className={styles.formula} data-visible={formulaVisible}>CERAMIDE&nbsp;&nbsp;+&nbsp;&nbsp;CHOLESTEROL&nbsp;&nbsp;+&nbsp;&nbsp;FATTY ACID</p>
      <input className={styles.range} type="range" min="0" max="100" value={Math.round(amount)} aria-label="크림을 펴 바르는 정도" onChange={(event) => setAmount(Number(event.target.value))} />
    </main>
  );
}
