"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createEconomy, setFrozen, stepEconomy, type EconomyNode } from "./model/index";
import {
  GRAPH_SIZE,
  graphLayout,
  nodeLabel,
  nodeRadius,
  relationAmount,
  relationColor,
  relationLabelPoint,
  relationPath,
  relationTone,
  visibleRelations,
  type GraphMode,
  type GraphRelation,
} from "./rendering/field";
import styles from "./network.module.css";

const related = (edge: GraphRelation, id: string | null) => !id || edge.from === id || edge.to === id;

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

export default function FinancialNetworkThree() {
  const economy = useRef(createEconomy());
  const reference = useRef(createEconomy());
  const [mode, setMode] = useState<GraphMode>("payments");
  const [revision, setRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const running = useRef(true);
  const drag = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    const timer = window.setInterval(() => {
      if (!document.hidden && running.current && !preference.matches) {
        stepEconomy(economy.current, 4 / 24);
        stepEconomy(reference.current, 4 / 24);
        setRevision((value) => value + 1);
      }
    }, 1000 / 24);
    return () => {
      window.clearInterval(timer);
      preference.removeEventListener("change", update);
    };
  }, []);

  const points = useMemo(() => graphLayout(economy.current.nodes), []);
  const baseRelations = visibleRelations(economy.current, mode);
  // A liquidity lock changes the ledger, not the camera's analytical scope.
  // Relation isolation is therefore pointer/focus transient only.
  const focus = hovered;
  const impactRelations = mode === "debt" && focus
    ? visibleRelations(economy.current, "payments")
      .filter((edge) => related(edge, focus) && edge.kind !== "loan" && !edge.facility)
      .map((edge) => ({ ...edge, id: `impact:${edge.id}`, label: `${edge.label} 지급` }))
    : [];
  const relations = [...baseRelations, ...impactRelations];
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

  const reset = () => {
    economy.current = createEconomy();
    reference.current = createEconomy();
    setSelected([]);
    setHovered(null);
    setActiveId(null);
    setView({ x: 0, y: 0, zoom: 1 });
    redraw();
  };

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
        className={styles.graph}
        viewBox={`${view.x} ${view.y} ${graphWidth} ${graphHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={`${mode === "payments" ? "지급" : "채무"} 관계도`}
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
        <defs>
          <marker id="financial-network-three-arrow" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" viewBox="0 0 9 9">
            <path fill="context-stroke" d="M 0 0 L 9 4.5 L 0 9 z" />
          </marker>
        </defs>
        <g className={styles.edges}>
          {relations.map((edge) => {
            const path = relationPath(edge, points);
            const relevant = related(edge, focus);
            const from = economy.current.nodes.find((node) => node.id === edge.from)!;
            const to = economy.current.nodes.find((node) => node.id === edge.to)!;
            const labelPoint = relationLabelPoint(edge, points);
            // Payment view measures the actual moving balance this tick. Claim view and
            // the collateral facility instead measure the displayed outstanding amount.
            const carriesStock = mode === "debt" || edge.facility;
            const quantity = carriesStock ? edge.principal : edge.flow;
            const weight = carriesStock
              ? Math.min(5.3, 0.72 + Math.sqrt(Math.max(0, quantity)) * 0.17)
              : Math.min(5.6, 0.65 + Math.sqrt(Math.max(0, quantity)) * 1.55);
            const tone = relationTone(edge, mode);
            const edgeStyle = { "--edge-color": edge.arrears > 0.005 ? "#e94a58" : relationColor(tone), strokeWidth: weight } as CSSProperties;
            const labelVisible = active?.id === edge.id || Boolean(focus && related(edge, focus));
            return <g key={edge.id} className={`${!relevant ? styles.dimmed : ""} ${labelVisible ? styles.labelled : ""}`}>
              <path d={path} style={edgeStyle} className={`${styles.edge} ${edge.facility ? styles.facility : ""} ${edge.arrears > 0.005 ? styles.arrears : ""} ${active?.id === edge.id ? styles.edgeActive : ""}`} markerEnd="url(#financial-network-three-arrow)" />
              <text style={edgeStyle} className={styles.edgeLabel} x={labelPoint.x} y={labelPoint.y} textAnchor="middle">{edge.label} · {relationAmount(edge, mode)}</text>
              <path d={path} className={styles.edgeTarget} tabIndex={0} aria-label={`${nodeLabel(from)}에서 ${nodeLabel(to)}: ${edge.label}, ${relationAmount(edge, mode)}`} onPointerEnter={() => setActiveId(edge.id)} onPointerLeave={() => setActiveId(null)} onFocus={() => setActiveId(edge.id)} onBlur={() => setActiveId(null)} />
            </g>;
          })}
        </g>
        <g className={styles.nodes}>
          {economy.current.nodes.map((node) => {
            const point = points.get(node.id)!;
            const actualIncoming = economy.current.edges.filter((edge) => edge.to === node.id && edge.kind !== "backstopDisbursement").reduce((sum, edge) => sum + edge.flow, 0);
            const referenceIncoming = reference.current.edges.filter((edge) => edge.to === node.id && edge.kind !== "backstopDisbursement").reduce((sum, edge) => sum + edge.flow, 0);
            const affected = !node.frozen && referenceIncoming > 0.01 && actualIncoming / referenceIncoming < 0.85;
            const radius = nodeRadius(node);
            return <g key={node.id} style={nodeStyle(node)} className={`${styles.nodeGroup} ${nodeClass(node)} ${focus && !neighbors.has(node.id) ? styles.dimmed : ""} ${node.frozen ? styles.frozen : ""} ${affected ? styles.affected : ""} ${node.defaulted ? styles.defaulted : ""}`} transform={`translate(${point.x} ${point.y})`}>
              <circle className={styles.nodeHit} r={radius} tabIndex={0} role="button" aria-pressed={node.frozen} aria-label={`${nodeLabel(node)}${node.frozen ? ", 유동성 정지됨" : ", 유동성 정지"}`} onClick={() => toggle(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(node.id); } }} onPointerEnter={() => setHovered(node.id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)} />
              <text className={styles.nodeLabel} textAnchor="middle" dominantBaseline="middle">{nodeLabel(node)}</text>
              {node.sector === "household" && <text className={styles.householdLabel} x={radius + 7} dominantBaseline="middle">{nodeLabel(node)}</text>}
              {node.frozen && <text className={styles.stateLabel} textAnchor="middle" y={radius + 18}>동결</text>}
              {!node.frozen && affected && <text className={styles.stateLabel} textAnchor="middle" y={radius + 18}>유입 감소</text>}
            </g>;
          })}
        </g>
      </svg>
    </div>
    <nav className={styles.controls} aria-label="금융 네트워크 조작">
      <div className={styles.modeControl} role="group" aria-label="관계 표시 방식">
        <button type="button" aria-pressed={mode === "debt"} onClick={() => { setMode("debt"); setActiveId(null); }}>채무</button>
        <button type="button" aria-pressed={mode === "payments"} onClick={() => { setMode("payments"); setActiveId(null); }}>지급</button>
      </div>
      {reduced
        ? <button type="button" onClick={() => { stepEconomy(economy.current, 1); redraw(); }}>한 걸음</button>
        : <button type="button" onClick={() => { running.current = !running.current; setPaused(!running.current); }}>{paused ? "재생" : "정지"}</button>}
      <button type="button" onClick={release} disabled={!selected.length}>동결 해제</button>
      <button type="button" onClick={reset}>초기화</button>
    </nav>
    <div className={styles.zoom} aria-label="확대와 이동">
      <button type="button" onClick={() => zoom(view.zoom - 0.15)} aria-label="축소">−</button>
      <button type="button" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}>맞춤</button>
      <button type="button" onClick={() => zoom(view.zoom + 0.15)} aria-label="확대">+</button>
    </div>
    {selected.length > 0 && <aside className={styles.interaction} aria-live="polite"><strong>동결 · {economy.current.nodes.filter((node) => node.frozen).map(nodeLabel).join(", ")}</strong><span>잠긴 유동성 {economy.current.nodes.filter((node) => node.frozen).reduce((sum, node) => sum + node.cash - node.liquidCash, 0).toFixed(1)}</span><span>해제해도 결손은 복구되지 않음</span></aside>}
    {readout && <aside className={styles.readout} aria-live="polite"><span>{nodeLabel(economy.current.nodes.find((node) => node.id === readout.from)!)} → {nodeLabel(economy.current.nodes.find((node) => node.id === readout.to)!)}</span><strong>{readout.label} · {relationAmount(readout, mode)}</strong>{readout.arrears > 0.005 && <em>연체</em>}</aside>}
    <span className={styles.srOnly}>{revision}</span>
  </main>;
}
