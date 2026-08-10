"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./casino.module.css";

const STEP_INTERVAL_MS = 30;

export default function CasinoPriceReel({ digit, lane }: { digit: string; lane: number }) {
  const targetRef = useRef(digit);
  const visibleRef = useRef(digit);
  const [visible, setVisible] = useState(digit);

  useEffect(() => {
    targetRef.current = digit;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      visibleRef.current = digit;
      const frame = window.requestAnimationFrame(() => setVisible(digit));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [digit]);

  useEffect(() => {
    let frame = 0;
    let lastStep = performance.now() + lane * 8;

    const tick = (time: number) => {
      if (time - lastStep >= STEP_INTERVAL_MS && visibleRef.current !== targetRef.current) {
        const next = String((Number.parseInt(visibleRef.current, 10) + 1) % 10);
        visibleRef.current = next;
        setVisible(next);
        lastStep = time;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [lane]);

  return (
    <div className={styles.reel}>
      <span>{visible}</span>
    </div>
  );
}
