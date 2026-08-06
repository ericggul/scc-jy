"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CValCasinoDirection } from "./presenter";
import {
  buildCasinoRestingSequence,
  buildCasinoSpinSequence,
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
  const stripRef = useRef<HTMLDivElement>(null);
  const previousSymbolRef = useRef(reel.symbol);
  const sequenceIdRef = useRef(0);
  const [sequence, setSequence] = useState(() => buildCasinoRestingSequence(reel, 0));
  const reelId = reel.id;
  const reelKind = reel.kind;
  const reelSymbol = reel.symbol;

  useEffect(() => {
    if (reelKind === "unit" || previousSymbolRef.current === reelSymbol) return;
    sequenceIdRef.current += 1;
    const previousSymbol = previousSymbolRef.current;
    previousSymbolRef.current = reelSymbol;
    setSequence(buildCasinoSpinSequence(
      { id: reelId, kind: reelKind, symbol: reelSymbol },
      previousSymbol,
      sequenceIdRef.current,
      strength,
    ));
  }, [reelId, reelKind, reelSymbol, strength]);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || !sequence.spinning) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => {
        setSequence(buildCasinoRestingSequence(
          { id: reelId, kind: reelKind, symbol: reelSymbol },
          sequence.id,
        ));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const travel = sequence.steps * 100 / 3;
    const duration = Math.min(245, 105 + sequence.steps * 9);
    const animation = strip.animate(
      [
        { transform: "translateY(0)", filter: "blur(0)" },
        { transform: `translateY(-${travel * 0.3}%)`, filter: "blur(4px)", offset: 0.22 },
        { transform: `translateY(-${travel * 0.91}%)`, filter: "blur(2.4px)", offset: 0.79 },
        { transform: `translateY(-${travel}%)`, filter: "blur(0)" },
      ],
      {
        duration,
        delay,
        easing: "cubic-bezier(.12,.72,.18,1)",
        fill: "forwards",
      },
    );

    animation.onfinish = () => {
      setSequence((current) => current.id === sequence.id
        ? buildCasinoRestingSequence(
          { id: reelId, kind: reelKind, symbol: reelSymbol },
          current.id,
        )
        : current);
    };
    return () => animation.cancel();
  }, [delay, reelId, reelKind, reelSymbol, sequence]);

  const targetIndex = sequence.spinning ? sequence.steps + 1 : 1;

  return (
    <div className={`${styles.reel} ${styles[`reel${reel.kind}`]} ${styles[direction]}`}>
      <div className={styles.reelStrip} ref={stripRef}>
        {sequence.symbols.map((symbol, index) => (
          <span
            className={index === targetIndex ? styles.reelTarget : undefined}
            key={`${sequence.id}-${index}`}
          >
            {symbol}
          </span>
        ))}
      </div>
    </div>
  );
}
