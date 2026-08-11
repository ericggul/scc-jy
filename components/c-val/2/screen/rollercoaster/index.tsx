"use client";

import type { CSSProperties } from "react";
import type { CValSnapshot } from "@/components/c-val/2/model";
import { CValBloombergWorkstationFrame } from "@/components/c-val/2/visual";
import {
  presentCValTrajectory,
  type CValTrajectoryPoint,
  type CValTrajectoryTone,
} from "./presenter";
import styles from "./rollercoaster.module.css";

type TrackPoint = { x: number; y: number; normalX: number; normalY: number };

function toneClass(tone: CValTrajectoryTone) {
  if (tone === "positive") return styles.positive;
  if (tone === "negative") return styles.negative;
  return styles.neutral;
}

function trackGeometry(points: readonly CValTrajectoryPoint[]) {
  const prices = points.map((point) => point.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const range = maximum - minimum;
  const minimumReadableRange = Math.max(Math.abs(maximum) * 0.001, 0.01);
  const base = points.map((point, index) => ({
    x: 40 + index / Math.max(1, points.length - 1) * 1_120,
    // A flat market still sits above the ground line: the object remains a
    // coaster with a clear support rhythm instead of collapsing to a chart.
    y: range < minimumReadableRange
      ? 228
      : 408 - (point.price - minimum) / range * 354,
  }));

  return base.map((point, index): TrackPoint => {
    const previous = base[index - 1] ?? point;
    const next = base[index + 1] ?? point;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.max(Math.hypot(dx, dy), 0.001);
    return { ...point, normalX: -dy / length, normalY: dx / length };
  });
}

function polyline(points: readonly TrackPoint[], railOffset: number) {
  return points.map((point) => `${(point.x + point.normalX * railOffset).toFixed(2)},${(point.y + point.normalY * railOffset).toFixed(2)}`).join(" ");
}

function TrackSupports({ geometry }: { geometry: readonly TrackPoint[] }) {
  const groundY = 438;

  return (
    <g aria-hidden="true">
      {geometry.map((point, index) => {
        return (
          <g key={`support-${index + 1}`}>
            <line className={styles.supportPost} x1={point.x} y1={point.y} x2={point.x} y2={groundY} />
          </g>
        );
      })}
    </g>
  );
}

function RideTrack({ points, transitionMs }: { points: readonly CValTrajectoryPoint[]; transitionMs: number }) {
  const geometry = trackGeometry(points);
  const last = geometry.at(-1) ?? { x: 1_160, y: 240, normalX: 0, normalY: 1 };
  const previous = geometry.at(-2) ?? last;
  const angle = Math.atan2(last.y - previous.y, last.x - previous.x) * 180 / Math.PI;
  const carriageStyle = { "--ride-transition": `${transitionMs}ms`, transform: `translate(${last.x}px, ${last.y}px) rotate(${angle}deg)` } as CSSProperties;

  return (
    <svg className={styles.trackSvg} viewBox="0 0 1200 460" role="img" aria-label="Actual two-rail price track with a carried last-price coaster train">
      <TrackSupports geometry={geometry} />
      <polyline className={styles.rail} points={polyline(geometry, -6.5)} />
      <polyline className={styles.rail} points={polyline(geometry, 6.5)} />
      {geometry.map((point, index) => (
        <g key={points[index]?.id}>
          <line className={styles.tie} x1={point.x + point.normalX * -10} y1={point.y + point.normalY * -10} x2={point.x + point.normalX * 10} y2={point.y + point.normalY * 10} />
        </g>
      ))}
      <g className={styles.carriage} style={carriageStyle}>
        <path className={styles.coasterChassis} d="M-150,-15 H-3 V-7 H-150 Z" />
        <g className={styles.coasterCar} transform="translate(-142 0)">
          <path d="M0,-15 V-38 Q0,-48 10,-48 H18 Q28,-48 28,-38 V-15 Z" />
        </g>
        <g className={styles.coasterCar} transform="translate(-106 0)">
          <path d="M0,-15 V-38 Q0,-48 10,-48 H18 Q28,-48 28,-38 V-15 Z" />
        </g>
        <g className={styles.coasterCar} transform="translate(-70 0)">
          <path d="M0,-15 V-38 Q0,-48 10,-48 H18 Q28,-48 28,-38 V-15 Z" />
        </g>
        <g className={styles.coasterCar} transform="translate(-34 0)">
          <path d="M0,-15 V-38 Q0,-48 10,-48 H18 Q28,-48 28,-38 V-15 Z" />
        </g>
        <path className={styles.coasterRestraint} d="M-137,-26 H-8" />
      </g>
    </svg>
  );
}

export default function CValRollercoasterScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const presentation = presentCValTrajectory(snapshot);
  const readoutFacts = presentation.facts.filter((fact) => ["amplitude", "run-move", "reversals", "gap"].includes(fact.id));

  return (
    <CValBloombergWorkstationFrame className={styles.stage} aria-label={`C-VAL rollercoaster price track. Carried price ${presentation.price.toFixed(2)}.`}>
      <main className={styles.instrument}>
        <section className={styles.trackField} aria-label="Twenty-eight actual prices as a carried two-rail track">
          <RideTrack points={presentation.points} transitionMs={presentation.transitionMs} />
        </section>

        <aside className={styles.rideReadout} aria-label="Current price and ride facts">
          <div className={styles.carriedPrice}>
            <span>LAST</span>
            <strong className={toneClass(presentation.tone)}>{presentation.price.toFixed(2)}</strong>
            <b>{presentation.cadenceMs === null ? "—" : `${Math.round(presentation.cadenceMs)} MS`}</b>
          </div>
          <div className={styles.factRows}>
            {readoutFacts.map((fact) => (
              <div key={fact.id}>
                <span>{fact.label}</span><strong className={fact.tone ? toneClass(fact.tone) : undefined}>{fact.value}</strong><b>{fact.unit}</b>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.rideLedger} aria-label="Complete ordered record of the twenty-eight carried prices">
          <div className={styles.ledgerGrid}>
            {presentation.points.map((point) => (
              <article key={point.id} aria-label={`Point ${point.position}: ${point.price.toFixed(2)}, ${point.stepPercent.toFixed(2)} percent`}>
                <strong>{point.price.toFixed(2)}</strong>
                <b className={toneClass(point.tone)}>{point.position === 1 ? "—" : `${point.stepPercent >= 0 ? "+" : ""}${point.stepPercent.toFixed(2)}%`}</b>
              </article>
            ))}
          </div>
        </section>
      </main>
    </CValBloombergWorkstationFrame>
  );
}
