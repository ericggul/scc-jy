"use client";

import type { CSSProperties } from "react";
import type { CValSnapshot } from "@/components/1/model";
import { CValBloombergWorkstationFrame } from "@/components/1/visual";
import {
  presentCValCasino,
  type CValCasinoDrum,
  type CValCasinoTone,
} from "./presenter";
import styles from "./casino.module.css";

function toneClass(tone: CValCasinoTone) {
  if (tone === "positive") return styles.positive;
  if (tone === "negative") return styles.negative;
  return styles.neutral;
}

function PriceDrum({ drum }: { drum: CValCasinoDrum }) {
  return (
    <div className={`${styles.drum} ${drum.changed ? styles.drumChanged : ""}`} data-position={drum.position}>
      <small>REEL {String(drum.position).padStart(2, "0")}</small>
      <div className={styles.reelWindow} aria-label={`Price reel ${drum.position}, current digit ${drum.reel[2]}`}>
        {drum.reel.map((digit, index) => (
          <span data-slot={index - 2} key={`${drum.id}-${index}`}>{digit}</span>
        ))}
      </div>
    </div>
  );
}

export default function CValCasinoScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const presentation = presentCValCasino(snapshot);
  const registerStyle = {
    "--settlement-ms": `${presentation.transitionMs}ms`,
  } as CSSProperties;

  return (
    <CValBloombergWorkstationFrame
      className={styles.stage}
      aria-label={`C-VAL casino price register. Settled price ${presentation.priceText}`}
    >
      <main className={styles.instrument}>
        <section className={styles.resultLedger} aria-label="Twenty-four actual settled price outcomes">
          <header><strong>RESULTS</strong><span>{presentation.outcomes.length} ACTUAL</span></header>
          <div className={styles.ledgerHead} aria-hidden="true"><span>SEQ</span><span>RESULT</span><span>STEP</span></div>
          <div className={styles.ledgerColumns}>
            <div className={styles.ledgerColumn}>
              {presentation.outcomes.map((outcome) => (
                <div className={styles.ledgerRow} key={outcome.id}>
                  <span>{String(outcome.sequence).padStart(3, "0")}</span>
                  <strong>{outcome.price.toFixed(2)}</strong>
                  <b className={toneClass(outcome.tone)}>{outcome.sequence === presentation.outcomes[0]?.sequence ? "—" : `${outcome.stepPercent >= 0 ? "+" : ""}${outcome.stepPercent.toFixed(2)}%`}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.register} aria-label="Five-drum settled price register" style={registerStyle}>
          <div className={styles.registerCore}>
            <div className={styles.registerAxis} aria-hidden="true" />
            <div className={styles.drumMatrix}>
              {presentation.drums.slice(0, 3).map((drum) => <PriceDrum key={drum.id} drum={drum} />)}
              <div className={styles.decimalBridge} aria-label="Decimal point"><span /></div>
              {presentation.drums.slice(3).map((drum) => <PriceDrum key={drum.id} drum={drum} />)}
            </div>
          </div>
        </section>

        <section className={styles.cadenceField} aria-label="Actual settlement cadence and market movement">
          <div className={styles.signalValue}>
            <span>GAP</span>
            <strong>{presentation.cadenceMs === null ? "—" : Math.round(presentation.cadenceMs).toLocaleString()}</strong>
            <b>MS</b>
          </div>
          <div className={styles.factRows}>
            {presentation.facts.map((fact) => (
              <div className={styles.factRow} key={fact.id}>
                <span>{fact.label}</span>
                <strong className={fact.tone ? toneClass(fact.tone) : undefined}>{fact.value}</strong>
                <b>{fact.unit}</b>
              </div>
            ))}
          </div>
          <div className={styles.drumStatus} aria-label="Digit-change status">
            {presentation.drums.map((drum) => <span key={drum.id} data-changed={drum.changed}>{String(drum.position).padStart(2, "0")}</span>)}
          </div>
        </section>

        <section className={styles.outcomeStrip} aria-label="Full current price-outcome run">
          <div>
            {presentation.outcomes.map((outcome) => (
              <article key={outcome.id}>
                <span>{String(outcome.sequence).padStart(3, "0")}</span>
                <strong>{outcome.price.toFixed(2)}</strong>
                <b className={toneClass(outcome.tone)}>{outcome.sequence === presentation.outcomes[0]?.sequence ? "—" : `${outcome.stepPercent >= 0 ? "+" : ""}${outcome.stepPercent.toFixed(2)}%`}</b>
              </article>
            ))}
          </div>
        </section>
      </main>
    </CValBloombergWorkstationFrame>
  );
}
