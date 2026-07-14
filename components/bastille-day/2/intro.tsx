"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import styles from "./intro.module.css";

const WORD_GAP_ACTIVATION_RADIUS_VW = 10;
const WORD_GAP_MAX_WIDTH_EM = 0.8;

type IntroProps = {
  isBuffered: boolean;
  onEnter: () => void;
};

export function Intro({ isBuffered, onEnter }: IntroProps) {
  const gapRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.code !== "Space" && event.key !== "Enter")) return;

      event.preventDefault();
      onEnter();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEnter]);

  const setGapStrengths = (clientX: number, clientY: number) => {
    const activationRadius = window.innerWidth * (WORD_GAP_ACTIVATION_RADIUS_VW / 100);

    gapRefs.current.forEach((gap) => {
      if (!gap) return;

      const bounds = gap.getBoundingClientRect();
      const distance = Math.hypot(clientX - (bounds.left + bounds.width / 2), clientY - (bounds.top + bounds.height / 2));
      const strength = Math.max(0, 1 - distance / activationRadius);
      gap.style.setProperty("--gap-width", `${strength * WORD_GAP_MAX_WIDTH_EM}em`);
    });
  };

  const trackPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    setGapStrengths(event.clientX, event.clientY);
  };

  const closeWordGaps = () => {
    gapRefs.current.forEach((gap) => gap?.style.setProperty("--gap-width", "0em"));
  };

  return (
    <button className={styles.intro} type="button" aria-label="Entrer" aria-busy={!isBuffered} autoFocus onClick={onEnter} onPointerMove={trackPointer} onPointerLeave={closeWordGaps}>
      <span className={styles.title} aria-hidden="true">
        <span>la</span>
        <span
          ref={(node) => {
            gapRefs.current[0] = node;
          }}
          className={styles.wordGap}
        />
        <span>mort</span>
        <span
          ref={(node) => {
            gapRefs.current[1] = node;
          }}
          className={styles.wordGap}
        />
        <span>de</span>
        <span
          ref={(node) => {
            gapRefs.current[2] = node;
          }}
          className={styles.wordGap}
        />
        <span>la</span>
        <span
          ref={(node) => {
            gapRefs.current[3] = node;
          }}
          className={styles.wordGap}
        />
        <span>modernité</span>
      </span>
      <span className={styles.pointerCircle} aria-hidden="true" />
    </button>
  );
}
