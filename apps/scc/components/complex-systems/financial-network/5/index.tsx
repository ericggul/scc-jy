"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createEconomy, setFrozen, stepEconomy, type EconomyNode, type PopulationPreset } from "./model/index";
import {
  GRAPH_SIZE,
  graphLayout,
  relationArrowPath,
  nodeLabel,
  nodeRadius,
  relationAmount,
  relationColor,
  relationLabelPoint,
  relationPath,
  relationTone,
  visibleRelations,
  type GraphRelation,
} from "./rendering/field";
import styles from "./network.module.css";

const related = (edge: GraphRelation, id: string | null) => !id || edge.from === id || edge.to === id;
/** Below this visual epsilon the line is already sub-pixel and transparent. */
const LIVE_FLOW_EPSILON = 0.002;
const DENSE_HOUSEHOLD_COUNT = 100;

const labelStripe = (id: string) => {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 6;
};

const nodeStyle = (node: EconomyNode): CSSProperties => {
  const tone = node.sector === "bank" || node.sector === "fund"
    ? "#45acc7"
    : node.sector === "treasury" || node.sector === "centralBank"
      ? "#f0a000"
      : "#90948b";
  return { "--node-stroke": tone } as CSSProperties;
};

const nodeClass = (node: EconomyNode) => node.sector === "household"
  ? styles.household
  : node.sector === "firm"
    ? styles.firm
    : node.sector === "bank"
      ? styles.bank
      : node.sector === "fund"
        ? styles.fund
        : node.sector === "treasury"
          ? styles.treasury
          : styles.centralBank;

/**
 * A dangerous relationship is a failing payment relationship, not merely an
 * edge touching a red node. We use its own shortfall against the healthy
 * reference, the payer's lock/default, and recorded loan arrears.
 */
const threatIntervalForRelation = (
  edge: GraphRelation,
  referenceEdge: GraphRelation | undefined,
  from: EconomyNode,
  to: EconomyNode,
) => {
  const arrearsRatio = edge.principal > 0.005 ? edge.arrears / edge.principal : 0;
  const expectedFlow = referenceEdge?.flow ?? 0;
  const flowRatio = expectedFlow > 0.02 ? edge.flow / expectedFlow : 1;
  const stressed = Math.max(from.stress, to.stress);

  if (from.defaulted || to.defaulted || arrearsRatio >= 0.12 || (expectedFlow > 0.02 && flowRatio < 0.22)) return 100;
  if (from.frozen || arrearsRatio >= 0.055 || (expectedFlow > 0.02 && flowRatio < 0.5 && stressed >= 0.18)) return 200;
  if (expectedFlow > 0.02 && flowRatio < 0.78 && (to.frozen || stressed >= 0.12)) return 400;
  return null;
};

export default function FinancialNetworkFive() {
  const economy = useRef(createEconomy());
  const reference = useRef(createEconomy());
  const [revision, setRevision] = useState(0);
  const [labelFlows, setLabelFlows] = useState<Map<string, number>>(() => new Map());
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [population, setPopulation] = useState<PopulationPreset>("compact");
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const running = useRef(true);
  const drag = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    let lastPaint = 0;
    let nextLabelStripe = 0;
    const timer = window.setInterval(() => {
      if (!document.hidden && running.current && !preference.matches) {
        stepEconomy(economy.current, 4 / 24);
        stepEconomy(reference.current, 4 / 24);
        // The ledger settles at 24 Hz. The compact field samples at 12 Hz;
        // the 200-household field uses an 8 Hz geometry sample so its thousand
        // live SVG relations do not churn as one text raster.
        const now = performance.now();
        const visualHz = economy.current.nodes.filter((node) => node.sector === "household").length >= DENSE_HOUSEHOLD_COUNT ? 8 : 12;
        if (now - lastPaint >= 1000 / visualHz) {
          lastPaint = now;
          setRevision((value) => value + 1);
          // Refresh one sixth of value labels per visual tick. Each number is
          // current within half a second, without replacing the whole text
          // layer at one instant.
          const stripe = nextLabelStripe;
          nextLabelStripe = (nextLabelStripe + 1) % 6;
          setLabelFlows((previous) => {
            const next = new Map(previous);
            const initialize = next.size === 0;
            for (const edge of economy.current.edges) {
              if (initialize || labelStripe(edge.id) === stripe) next.set(edge.id, edge.flow);
            }
            return next;
          });
        }
      }
    }, 1000 / 24);
    return () => {
      window.clearInterval(timer);
      preference.removeEventListener("change", update);
    };
  }, []);

  const denseField = economy.current.nodes.filter((node) => node.sector === "household").length >= DENSE_HOUSEHOLD_COUNT;
  const points = useMemo(() => graphLayout(economy.current.nodes), [population]);
  const referenceNodes = new Map(reference.current.nodes.map((node) => [node.id, node]));
  const nodesById = new Map(economy.current.nodes.map((node) => [node.id, node]));
  const radii = new Map(economy.current.nodes.map((node) => [node.id, nodeRadius(node, referenceNodes.get(node.id), denseField)]));
  // This field is a transaction record, not a latent-obligation diagram. A
  // relation has geometry while actual payment flow remains above a sub-pixel
  // visual epsilon. Width and opacity themselves are never thresholded.
  const relations = visibleRelations(economy.current, "payments")
    .filter((edge) => !edge.facility && edge.flow > LIVE_FLOW_EPSILON);
  const referenceRelations = new Map(visibleRelations(reference.current, "payments").map((edge) => [edge.id, edge]));
  const incomingFlow = new Map<string, number>();
  const referenceIncomingFlow = new Map<string, number>();
  for (const edge of economy.current.edges) {
    if (edge.kind !== "backstopDisbursement") incomingFlow.set(edge.to, (incomingFlow.get(edge.to) ?? 0) + edge.flow);
  }
  for (const edge of reference.current.edges) {
    if (edge.kind !== "backstopDisbursement") referenceIncomingFlow.set(edge.to, (referenceIncomingFlow.get(edge.to) ?? 0) + edge.flow);
  }
  // A liquidity lock changes the ledger, not the camera's analytical scope.
  // Relation isolation is therefore pointer/focus transient only.
  const focus = hovered;
  const active = activeId ? relations.find((edge) => edge.id === activeId) ?? null : null;
  const readout = active ?? (focus ? relations.find((edge) => related(edge, focus)) ?? null : null);
  const neighbors = new Set(focus ? relations.filter((edge) => related(edge, focus)).flatMap((edge) => [edge.from, edge.to]) : []);
  const graphWidth = GRAPH_SIZE.width / view.zoom;
  const graphHeight = GRAPH_SIZE.height / view.zoom;
  const redraw = () => setRevision((value) => value + 1);

  const toggle = (id: string) => {
    const node = economy.current.nodes.find((item) => item.id === id);
    if (!node) return;
    setFrozen(economy.current, id, !node.frozen);
    setSelected(economy.current.nodes.filter((item) => item.frozen).map((item) => item.id));
    setHovered(null);
    redraw();
  };

  const release = () => {
    economy.current.nodes.forEach((node) => setFrozen(economy.current, node.id, false));
    setSelected([]);
    setHovered(null);
    setActiveId(null);
    redraw();
  };

  const replacePopulation = (nextPopulation: PopulationPreset) => {
    economy.current = createEconomy(nextPopulation);
    reference.current = createEconomy(nextPopulation);
    setPopulation(nextPopulation);
    setSelected([]);
    setHovered(null);
    setActiveId(null);
    setLabelFlows(new Map());
    setView({ x: 0, y: 0, zoom: 1 });
    setShowNodeLabels(nextPopulation === "compact");
    redraw();
  };

  const reset = () => replacePopulation(population);

  const zoom = (next: number) => setView((current) => {
    const value = Math.max(0.8, Math.min(1.55, next));
    return {
      zoom: value,
      x: Math.max(0, Math.min(GRAPH_SIZE.width - GRAPH_SIZE.width / value, current.x)),
      y: Math.max(0, Math.min(GRAPH_SIZE.height - GRAPH_SIZE.height / value, current.y)),
    };
  });

  return <main className={styles.field} aria-label="금융 네트워크" onKeyDown={(event) => { if (event.key === "Escape") release(); }}>
    <h1 className={styles.srOnly}>금융 네트워크</h1>
    <div className={styles.viewport}>
      <svg
        className={`${styles.graph} ${denseField ? styles.denseGraph : ""}`}
        viewBox={`${view.x} ${view.y} ${graphWidth} ${graphHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="실시간 거래 관계도"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) drag.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const unit = graphWidth / rect.width;
          const x = Math.max(0, Math.min(GRAPH_SIZE.width - graphWidth, drag.current.viewX - (event.clientX - drag.current.x) * unit));
          const y = Math.max(0, Math.min(GRAPH_SIZE.height - graphHeight, drag.current.viewY - (event.clientY - drag.current.y) * unit));
          setView((current) => ({ ...current, x, y }));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
      >
        <g className={styles.edges}>
          {relations.map((edge) => {
            const path = relationPath(edge, points, radii);
            const relevant = related(edge, focus);
            const from = nodesById.get(edge.from)!;
            const to = nodesById.get(edge.to)!;
            const labelPoint = relationLabelPoint(edge, points, radii);
            // Both curves begin at zero: a healthy payment circuit is legible
            // at a glance, while a drying channel still has no visual floor.
            const weight = Math.min(7.5, Math.pow(edge.flow, 0.46) * 2.85);
            const opacity = Math.min(0.96, Math.pow(edge.flow, 0.3) * 0.68);
            const arrow = relationArrowPath(edge, points, Math.max(1.8, weight * 2.7), radii);
            const tone = relationTone(edge, "payments");
            const edgeStyle = { "--edge-color": relationColor(tone), strokeWidth: weight, opacity } as CSSProperties;
            const labelStyle = { "--edge-color": relationColor(tone) } as CSSProperties;
            const labelFlow = labelFlows.get(edge.id) ?? edge.flow;
            const threatInterval = threatIntervalForRelation(edge, referenceRelations.get(edge.id), from, to);
            const relationStyle = threatInterval
              ? { "--threat-cycle": `${threatInterval * 2}ms` } as CSSProperties
              : undefined;
            return <g key={edge.id} style={relationStyle} className={`${!relevant ? styles.dimmed : ""} ${threatInterval ? styles.edgeThreat : ""}`}>
              <path d={path} style={edgeStyle} className={`${styles.edge} ${active?.id === edge.id ? styles.edgeActive : ""}`} />
              <path d={arrow} style={edgeStyle} className={styles.arrow} />
              <text style={labelStyle} className={styles.edgeLabel} x={labelPoint.x} y={labelPoint.y} textAnchor="middle">{labelFlow.toFixed(2)}</text>
              <path d={path} className={styles.edgeTarget} tabIndex={0} aria-label={`${nodeLabel(from)}에서 ${nodeLabel(to)}: ${edge.label}, ${relationAmount(edge, "payments")}`} onPointerEnter={() => setActiveId(edge.id)} onPointerLeave={() => setActiveId(null)} onFocus={() => setActiveId(edge.id)} onBlur={() => setActiveId(null)} />
            </g>;
          })}
        </g>
        <g className={styles.nodes}>
          {economy.current.nodes.map((node) => {
            const point = points.get(node.id)!;
            const actualIncoming = incomingFlow.get(node.id) ?? 0;
            const referenceIncoming = referenceIncomingFlow.get(node.id) ?? 0;
            const incomingRatio = referenceIncoming > 0.01 ? actualIncoming / referenceIncoming : 1;
            const affected = !node.frozen && incomingRatio < 0.85;
            // A flash is a binary visual event: normal cell background, then
            // red background. The interval between those two states shortens
            // as the payment shortfall turns into a systemic threat.
            const threatInterval = node.defaulted || incomingRatio < 0.3 || node.stress >= 0.7
              ? 100
              : node.frozen || incomingRatio < 0.6 || node.stress >= 0.4
                ? 200
                : affected || node.stress >= 0.2
                  ? 400
                  : null;
            const radius = radii.get(node.id)!;
            const style = threatInterval
              ? { ...nodeStyle(node), "--threat-cycle": `${threatInterval * 2}ms` } as CSSProperties
              : nodeStyle(node);
            return <g key={node.id} style={style} className={`${styles.nodeGroup} ${nodeClass(node)} ${focus && !neighbors.has(node.id) ? styles.dimmed : ""} ${node.frozen ? styles.frozen : ""} ${affected ? styles.affected : ""} ${node.defaulted ? styles.defaulted : ""} ${threatInterval ? styles.threat : ""}`} transform={`translate(${point.x} ${point.y})`}>
              <circle className={styles.nodeHit} r={radius} tabIndex={0} role="button" aria-pressed={node.frozen} aria-label={`${nodeLabel(node)}${node.frozen ? ", 유동성 정지됨" : ", 유동성 정지"}`} onClick={() => toggle(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(node.id); } }} onPointerEnter={() => setHovered(node.id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)} />
              {showNodeLabels && <text className={styles.nodeLabel} textAnchor="middle" dominantBaseline="middle">{nodeLabel(node)}</text>}
              {showNodeLabels && node.sector === "household" && <text className={styles.householdLabel} x={radius + 7} dominantBaseline="middle">{nodeLabel(node)}</text>}
              {showNodeLabels && node.frozen && <text className={styles.stateLabel} textAnchor="middle" y={radius + 18}>동결</text>}
              {showNodeLabels && !node.frozen && affected && <text className={styles.stateLabel} textAnchor="middle" y={radius + 18}>유입 감소</text>}
            </g>;
          })}
        </g>
      </svg>
    </div>
    <nav className={styles.controls} aria-label="금융 네트워크 조작">
      {reduced
        ? <button type="button" onClick={() => { stepEconomy(economy.current, 1); redraw(); }}>한 걸음</button>
        : <button type="button" onClick={() => { running.current = !running.current; setPaused(!running.current); }}>{paused ? "재생" : "정지"}</button>}
      <button type="button" onClick={() => replacePopulation(population === "compact" ? "expanded" : "compact")} aria-pressed={population === "expanded"}>200명</button>
      <button type="button" onClick={() => setShowNodeLabels((visible) => !visible)} aria-pressed={showNodeLabels}>노드명</button>
      <button type="button" onClick={release} disabled={!selected.length}>동결 해제</button>
      <button type="button" onClick={reset}>초기화</button>
    </nav>
    <div className={styles.zoom} aria-label="확대와 이동">
      <button type="button" onClick={() => zoom(view.zoom - 0.15)} aria-label="축소">−</button>
      <button type="button" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}>맞춤</button>
      <button type="button" onClick={() => zoom(view.zoom + 0.15)} aria-label="확대">+</button>
    </div>
    {selected.length > 0 && <aside className={styles.interaction} aria-live="polite"><strong>동결 · {economy.current.nodes.filter((node) => node.frozen).map(nodeLabel).join(", ")}</strong><span>잠긴 유동성 {economy.current.nodes.filter((node) => node.frozen).reduce((sum, node) => sum + node.cash - node.liquidCash, 0).toFixed(1)}</span><span>해제해도 결손은 복구되지 않음</span></aside>}
    {readout && <aside className={styles.readout} aria-live="polite"><span>{nodeLabel(nodesById.get(readout.from)!)} → {nodeLabel(nodesById.get(readout.to)!)}</span><strong>{readout.label} · {relationAmount(readout, "payments")}</strong>{readout.arrears > 0.005 && <em>연체</em>}</aside>}
    <span className={styles.srOnly}>{revision}</span>
  </main>;
}
