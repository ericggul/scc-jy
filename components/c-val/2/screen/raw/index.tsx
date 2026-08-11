"use client";

import styled from "styled-components";
import type { CValSnapshot } from "@/components/c-val/2/model";
import { presentCValCasino } from "../casino/presenter";

/**
 * This is intentionally not a C-VAL workstation primitive.  It pins only the
 * browser-terminal substrate visible in the supplied reference: a black field
 * and the browser's ordinary 16px monospace text.  All children below retain
 * normal block/inline flow without a layout system, panel chrome, spacing, or
 * type scale layered on top.
 */
const RawField = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  color: #d8d8d2;
  font: 400 16px / normal monospace;
  font-variant-numeric: normal;
`;

/**
 * Deliberately raw C-VAL text flow. It has only the supplied reference's
 * browser-default monospace metrics and terminal ink; the document itself uses
 * default block/inline flow—no CSS grid, component spacing, or chrome.
 */
export default function CValRawScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const presentation = presentCValCasino(snapshot);
  const priceDigits = presentation.priceText.replace(/\D/g, "").slice(-5).padStart(5, "0");
  const registerDrums = [...priceDigits].map((value, index) => {
    const digit = Number(value);

    return {
      id: `raw-drum-${index + 1}`,
      position: index + 1,
      previous: String((digit + 9) % 10),
      value,
      next: String((digit + 1) % 10),
    };
  });

  return (
    <RawField aria-label="Raw C-VAL execution text flow">
      <main>
        <section>
          <header><strong>RESULT LEDGER</strong><span>{presentation.outcomes.length} ACTUAL OUTCOMES</span></header>
          <div><span>SEQ</span><span>RESULT</span><span>STEP</span></div>
          {presentation.outcomes.map((outcome) => (
            <div key={outcome.id}>
              <span>{String(outcome.sequence).padStart(3, "0")}</span>
              <strong>{outcome.price.toFixed(2)}</strong>
              <b>{outcome.sequence === presentation.outcomes[0]?.sequence ? "—" : `${outcome.stepPercent >= 0 ? "+" : ""}${outcome.stepPercent.toFixed(2)}%`}</b>
            </div>
          ))}
        </section>

        <section>
          <header><strong>SETTLED PRICE REGISTER</strong><span>{presentation.phase === "active" ? `${presentation.changedDrums} DRUMS SHIFTED` : "REGISTER HELD AT OPEN"}</span></header>
          {registerDrums.map((drum) => (
            <div key={drum.id}>
              <small>DRUM {drum.position}</small><span>{drum.previous}</span><strong>{drum.value}</strong><span>{drum.next}</span>
            </div>
          ))}
          <i>.</i>
          <footer><span>PREVIOUS DIGIT</span><b>{presentation.priceText}</b><span>NEXT DIGIT</span></footer>
        </section>

        <section>
          <header><strong>SETTLEMENT SIGNAL</strong><span>ONE PRICE / ONE RESULT</span></header>
          <div><span>LAST GAP</span><strong>{presentation.cadenceMs === null ? "—" : Math.round(presentation.cadenceMs)}</strong><b>MS</b></div>
          {presentation.facts.map((fact) => <div key={fact.id}><span>{fact.label}</span><strong>{fact.value}</strong><b>{fact.unit}</b></div>)}
          <div>{presentation.drums.map((drum) => <span key={drum.id}>{String(drum.position).padStart(2, "0")}</span>)}</div>
        </section>

        <section>
          <header><strong>CURRENT OUTCOME RUN</strong><span>SEQ / SETTLED PRICE / STEP</span></header>
          {presentation.outcomes.map((outcome) => (
            <article key={outcome.id}>
              <span>{String(outcome.sequence).padStart(3, "0")}</span><strong>{outcome.price.toFixed(2)}</strong><b>{outcome.sequence === presentation.outcomes[0]?.sequence ? "—" : `${outcome.stepPercent >= 0 ? "+" : ""}${outcome.stepPercent.toFixed(2)}%`}</b>
            </article>
          ))}
        </section>
      </main>
    </RawField>
  );
}
