import styles from "@/components/network-system/macro-economy/wrappers/wrappers.module.css";
import {
  cycleNodeLabels,
  cycleScreenNodeMap,
  type CycleNodeId,
  type CycleSnapshot,
} from "@/components/network-system/cycle/model";
import type { NetworkSystemScreenId } from "@/components/network-system/experiments";

const screenMeta: Record<NetworkSystemScreenId, { code: string; title: string; secondary: CycleNodeId }> = {
  "1": { code: "HD", title: "HOUSEHOLD DEMAND", secondary: "employment" },
  "2": { code: "PR", title: "PRODUCTION", secondary: "inventories" },
  "3": { code: "CR", title: "CREDIT", secondary: "policy-rate" },
  "4": { code: "PI", title: "INFLATION", secondary: "wage-share" },
};

function trend(history: number[]) {
  const difference = (history.at(-1) ?? 0) - (history.at(-8) ?? history[0] ?? 0);
  if (difference > 0.002) return "rising" as const;
  if (difference < -0.002) return "falling" as const;
  return "steady" as const;
}

function linePath(values: number[]) {
  const maximum = Math.max(0.1, ...values.map((value) => Math.abs(value)));
  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = 16 - (value / maximum) * 15;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

export function CycleNodeWrapper({
  screenId,
  snapshot,
}: {
  screenId: NetworkSystemScreenId;
  snapshot: CycleSnapshot;
}) {
  const meta = screenMeta[screenId];
  const nodeId = cycleScreenNodeMap[screenId];
  const history = snapshot.history[nodeId];
  const currentTrend = trend(history);
  const previous = history.at(-6) ?? snapshot.values[nodeId];
  const change = snapshot.values[nodeId] - previous;

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <span>{meta.code}</span>
        <h1>{meta.title}</h1>
      </header>
      <div className={styles.primary}>
        <p>{cycleNodeLabels[nodeId]}</p>
        <strong>{snapshot.values[nodeId].toFixed(2)}</strong>
        <span data-trend={currentTrend}>
          {currentTrend.toUpperCase()} · Δ 1s {change >= 0 ? "+" : ""}{change.toFixed(2)}
        </span>
      </div>
      <svg aria-label={`${cycleNodeLabels[nodeId]} history`} className={styles.trace} data-trend={currentTrend} preserveAspectRatio="none" viewBox="0 0 100 32">
        <line x1="0" x2="100" y1="16" y2="16" />
        <path d={linePath(history)} />
      </svg>
      <dl className={styles.parameters}>
        <div>
          <dt>{cycleNodeLabels[meta.secondary]}</dt>
          <dd><strong>{snapshot.values[meta.secondary].toFixed(2)}</strong></dd>
        </div>
        <div>
          <dt>ANNUAL GDP GROWTH</dt>
          <dd><strong>{snapshot.gdpGrowth >= 0 ? "+" : ""}{snapshot.gdpGrowth.toFixed(2)}%</strong></dd>
        </div>
      </dl>
    </section>
  );
}
