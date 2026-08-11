"use client";

import { memo, useMemo, useRef } from "react";
import type { CValSnapshot } from "@/components/c-val/2/model";
import { CValBloombergWorkstationFrame } from "@/components/c-val/2/visual";
import {
  formatCValGraphChange,
  formatCValGraphValue,
  presentCValGraphMatrix,
  type CValGraphCell,
} from "./presenter";
import CValGraphPlotCanvas from "./plot-canvas";
import styles from "./graphs.module.css";

function toneClass(cell: CValGraphCell) {
  if (cell.tone === "positive") return styles.positive;
  if (cell.tone === "negative") return styles.negative;
  if (cell.tone === "amber") return styles.amber;
  if (cell.tone === "cyan") return styles.cyan;
  return styles.neutral;
}

function graphTransitionMs(snapshot: CValSnapshot) {
  const timestamps = snapshot.recentTrades
    .map((trade) => trade.executedAt)
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);
  const gaps = timestamps.slice(1)
    .map((timestamp, index) => timestamp - (timestamps[index] ?? timestamp))
    .filter((gap) => gap > 0 && gap < 60_000);
  const meanGap = gaps.length > 0
    ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    : 180;
  const marketUrgency = Math.min(1, Math.abs(snapshot.market.oneSecondMovePercent) / 30);
  return Math.round(Math.max(55, Math.min(320, meanGap * (0.88 - marketUrgency * 0.42))));
}

const GraphCell = memo(function GraphCell({ cell }: { cell: CValGraphCell }) {
  const tone = toneClass(cell);
  return (
    <section className={styles.cell} data-graph-cell={cell.id} aria-label={`${cell.channel}, chronological window ${cell.window}, last ${formatCValGraphValue(cell)}`}>
      <header>
        <strong>{cell.channel}</strong>
        <span>W{String(cell.window).padStart(2, "0")}</span>
      </header>
      <div className={styles.plot} aria-hidden="true" />
      <footer>
        <strong>{formatCValGraphValue(cell)}</strong>
        <span className={tone}>{formatCValGraphChange(cell)}</span>
      </footer>
    </section>
  );
});

export default function CValGraphsScreen({ snapshot }: { snapshot: CValSnapshot }) {
  const cells = useMemo(() => presentCValGraphMatrix(snapshot), [snapshot]);
  const matrixRef = useRef<HTMLDivElement>(null);
  const transitionMs = graphTransitionMs(snapshot);

  return (
    <CValBloombergWorkstationFrame className={styles.stage} aria-label="C-VAL 100-chart market matrix">
      <div className={styles.viewport}>
        <div className={styles.matrix} ref={matrixRef}>
          <CValGraphPlotCanvas cells={cells} matrixRef={matrixRef} transitionMs={transitionMs} />
          {cells.map((cell) => <GraphCell key={cell.id} cell={cell} />)}
        </div>
      </div>
    </CValBloombergWorkstationFrame>
  );
}
