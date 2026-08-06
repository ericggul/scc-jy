"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { CValSnapshot } from "@/components/c-val/2/model";
import {
  presentCValCasino,
  type CValCasinoMode,
  type CValCasinoPresentation,
} from "./presenter";
import CasinoReel, { type CasinoReelDefinition } from "./reel";
import styles from "./casino.module.css";

function buildReels(presentation: CValCasinoPresentation): CasinoReelDefinition[] {
  const fractionReels = presentation.fractionalDigits.map((digit, index) => ({
    id: `fraction-${index + 1}`,
    kind: "digit" as const,
    symbol: String(digit),
  }));

  if (presentation.mode === "price") {
    return [
      ...presentation.integerDigits.map((digit, index, digits) => ({
        id: `integer-from-right-${digits.length - index}`,
        kind: "digit" as const,
        symbol: String(digit),
      })),
      ...fractionReels,
    ];
  }

  return [
    { id: "direction-sign", kind: "sign", symbol: presentation.sign ?? "—" },
    { id: "change-integer", kind: "integer", symbol: presentation.integerDigits.join("") },
    ...fractionReels,
    { id: "percent-unit", kind: "unit", symbol: "%" },
  ];
}

function modeValue(snapshot: CValSnapshot, mode: CValCasinoMode) {
  return presentCValCasino(snapshot, mode).text;
}

export default function CValCasinoScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const [mode, setMode] = useState<CValCasinoMode>("change");
  const presentation = presentCValCasino(snapshot, mode);
  const reels = useMemo(() => buildReels(presentation), [presentation]);
  const decimalAfter = mode === "change" ? 2 : presentation.integerDigits.length;
  const matrixStyle = {
    "--decimal-x": decimalAfter === 2 ? "42.35%" : "56.85%",
    "--motion-strength": presentation.spinStrength,
  } as CSSProperties;

  return (
    <main
      className={`${styles.stage} ${styles[presentation.direction]}`}
      aria-label={`${mode === "change" ? "최근 1초 실제 체결 증감률" : "현재 체결 시장 가격"} 슬롯 릴. 현재 ${presentation.text}`}
    >
      <section className={styles.machine}>
        <header className={styles.header}>
          <span className={styles.brand}>C·VAL</span>
          <span className={styles.machineName}>{mode === "change" ? "ONE SECOND CHANGE" : "CURRENT PRICE"}</span>
        </header>

        <div className={styles.reelMatrix} style={matrixStyle} aria-hidden="true">
          {reels.map((reel, index) => (
            <CasinoReel
              key={reel.id}
              reel={reel}
              delay={index * 10}
              strength={presentation.spinStrength}
              direction={presentation.direction}
            />
          ))}
          <span className={styles.decimalMarker}>.</span>
        </div>

        <footer className={styles.playDeck}>
          <button
            className={`${styles.modeButton} ${mode === "change" ? styles.modeButtonActive : ""}`}
            type="button"
            aria-pressed={mode === "change"}
            onClick={() => setMode("change")}
          >
            <span>CHANGE</span>
            <strong>{modeValue(snapshot, "change")}</strong>
          </button>

          <div className={styles.livePlate}>
            <span className={styles.liveLamp} aria-hidden="true" />
            <span>{snapshot.phase === "active" ? "EXECUTION ACTIVE" : "WAITING FOR MARKET"}</span>
          </div>

          <button
            className={`${styles.modeButton} ${mode === "price" ? styles.modeButtonActive : ""}`}
            type="button"
            aria-pressed={mode === "price"}
            onClick={() => setMode("price")}
          >
            <span>PRICE</span>
            <strong>{modeValue(snapshot, "price")}</strong>
          </button>
        </footer>
      </section>
    </main>
  );
}
