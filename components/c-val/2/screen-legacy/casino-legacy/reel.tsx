"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CValCasinoDirection } from "./presenter";
import {
  buildCasinoRestingSequence,
  buildCasinoSpinSequence,
  getCasinoVisibleWindow,
  type CasinoReelDefinition,
} from "./reel-motion";
import styles from "./casino.module.css";

export type { CasinoReelDefinition } from "./reel-motion";

export default function CasinoReel({
  reel,
  delay,
  strength,
  direction,
}: {
  reel: CasinoReelDefinition;
  delay: number;
  strength: number;
  direction: CValCasinoDirection;
}) {
  const definitionRef = useRef(reel);
  const strengthRef = useRef(strength);
  const displayedSymbolRef = useRef(reel.symbol);
  const activeTargetRef = useRef(reel.symbol);
  const queuedTargetRef = useRef(reel.symbol);
  const spinningRef = useRef(false);
  const sequenceIdRef = useRef(0);
  const frameIndexRef = useRef(0);
  const [sequence, setSequence] = useState(() => buildCasinoRestingSequence(reel, 0));
  const [frameIndex, setFrameIndex] = useState(0);
  const reelId = reel.id;
  const reelKind = reel.kind;
  const reelSymbol = reel.symbol;

  const beginSpin = useCallback((targetSymbol: string) => {
    const definition = { ...definitionRef.current, symbol: targetSymbol };
    sequenceIdRef.current += 1;
    activeTargetRef.current = targetSymbol;
    spinningRef.current = true;
    frameIndexRef.current = 0;
    setFrameIndex(0);
    setSequence(buildCasinoSpinSequence(
      definition,
      displayedSymbolRef.current,
      sequenceIdRef.current,
      strengthRef.current,
    ));
  }, []);

  useEffect(() => {
    definitionRef.current = { id: reelId, kind: reelKind, symbol: reelSymbol };
    strengthRef.current = strength;
    queuedTargetRef.current = reelSymbol;

    if (reelKind === "unit") {
      displayedSymbolRef.current = reelSymbol;
      activeTargetRef.current = reelSymbol;
      spinningRef.current = false;
      return;
    }

    if (!spinningRef.current && displayedSymbolRef.current !== reelSymbol) {
      beginSpin(reelSymbol);
    }
  }, [beginSpin, reelId, reelKind, reelSymbol, strength]);

  useLayoutEffect(() => {
    if (!sequence.spinning) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const targetSymbol = queuedTargetRef.current;
      const definition = { ...definitionRef.current, symbol: targetSymbol };
      displayedSymbolRef.current = targetSymbol;
      activeTargetRef.current = targetSymbol;
      spinningRef.current = false;
      frameIndexRef.current = 0;
      const frame = window.requestAnimationFrame(() => {
        setFrameIndex(0);
        setSequence(buildCasinoRestingSequence(definition, sequence.id));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const duration = Math.min(245, 105 + sequence.steps * 9);
    let frame = 0;
    let startedAt: number | null = null;

    const settleOrContinue = () => {
      const settledSymbol = activeTargetRef.current;
      displayedSymbolRef.current = settledSymbol;
      const queuedSymbol = queuedTargetRef.current;

      if (queuedSymbol !== settledSymbol) {
        beginSpin(queuedSymbol);
        return;
      }

      spinningRef.current = false;
      frameIndexRef.current = 0;
      setFrameIndex(0);
      setSequence((current) => current.id === sequence.id
        ? buildCasinoRestingSequence(
          { ...definitionRef.current, symbol: settledSymbol },
          current.id,
        )
        : current);
    };

    const tick = (time: number) => {
      if (startedAt === null) startedAt = time + delay;
      if (time < startedAt) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const completedSteps = Math.min(sequence.steps, Math.floor(eased * (sequence.steps + 1)));
      if (completedSteps !== frameIndexRef.current) {
        frameIndexRef.current = completedSteps;
        setFrameIndex(completedSteps);
      }

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
        return;
      }

      settleOrContinue();
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [beginSpin, delay, sequence]);

  const visibleSymbols = getCasinoVisibleWindow(sequence, frameIndex);

  return (
    <div className={`${styles.reel} ${styles[`reel${reel.kind}`]} ${styles[direction]}`}>
      <div className={styles.reelCells}>
        {visibleSymbols.map((symbol, index) => (
          <span className={index === 1 ? styles.reelCenter : undefined} key={["top", "center", "bottom"][index]}>
            {symbol}
          </span>
        ))}
      </div>
    </div>
  );
}
