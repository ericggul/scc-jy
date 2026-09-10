"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createEconomy, setFrozen, stepEconomy, type EconomyNode } from "./model/index";
import { GRAPH_SIZE, graphLayout, nodeLabel, relationAmount, relationLabelPoint, relationPath, visibleRelations, type GraphMode, type GraphRelation } from "./rendering/field";
import styles from "./network.module.css";

const related = (edge: GraphRelation, id: string | null) => !id || edge.from === id || edge.to === id;
const shape = (node: EconomyNode) => node.sector === "household" ? "household" : node.sector === "bank" ? "bank" : "institution";

export default function FinancialNetwork() {
  const economy = useRef(createEconomy());
  const reference = useRef(createEconomy());
  const [mode, setMode] = useState<GraphMode>("debt");
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
    update(); preference.addEventListener("change", update);
    const timer = window.setInterval(() => { if (!document.hidden && running.current && !preference.matches) { stepEconomy(economy.current, 4 / 24); stepEconomy(reference.current, 4 / 24); setRevision((n) => n + 1); } }, 1000 / 24);
    return () => { window.clearInterval(timer); preference.removeEventListener("change", update); };
  }, []);

  const points = useMemo(() => graphLayout(economy.current.nodes), []);
  const baseRelations = visibleRelations(economy.current, mode);
  const focus = hovered ?? selected.at(-1) ?? null;
  const impactRelations = mode === "debt" && focus ? visibleRelations(economy.current, "payments").filter((edge) => related(edge, focus) && edge.kind !== "loan" && !edge.facility).map((edge) => ({ ...edge, id: `impact:${edge.id}`, label: `${edge.label} 지급` })) : [];
  const relations = [...baseRelations, ...impactRelations];
  const active = activeId ? relations.find((edge) => edge.id === activeId) ?? null : null;
  const readout = active ?? (focus ? relations.find((edge) => related(edge, focus)) ?? null : null);
  const neighbors = new Set(focus ? relations.filter((edge) => related(edge, focus)).flatMap((edge) => [edge.from, edge.to]) : []);
  const graphWidth = GRAPH_SIZE.width / view.zoom;
  const graphHeight = GRAPH_SIZE.height / view.zoom;
  const redraw = () => setRevision((n) => n + 1);
  const toggle = (id: string) => {
    const node = economy.current.nodes.find((item) => item.id === id); if (!node) return;
    setFrozen(economy.current, id, !node.frozen);
    setSelected(economy.current.nodes.filter((item) => item.frozen).map((item) => item.id)); setHovered(id); redraw();
  };
  const release = () => { economy.current.nodes.forEach((node) => setFrozen(economy.current, node.id, false)); setSelected([]); setHovered(null); setActiveId(null); redraw(); };
  const reset = () => { economy.current = createEconomy(); reference.current = createEconomy(); setSelected([]); setHovered(null); setActiveId(null); setView({ x: 0, y: 0, zoom: 1 }); redraw(); };
  const zoom = (next: number) => setView((current) => { const value = Math.max(.8, Math.min(1.55, next)); return { zoom: value, x: Math.max(0, Math.min(GRAPH_SIZE.width - GRAPH_SIZE.width / value, current.x)), y: Math.max(0, Math.min(GRAPH_SIZE.height - GRAPH_SIZE.height / value, current.y)) }; });

  return <main className={styles.field} aria-label="금융 네트워크" onKeyDown={(event) => { if (event.key === "Escape") release(); }}>
    <header className={styles.header}>클릭: 가용자금 85% 동결 · 다시 클릭: 해제 · 지급 버퍼 때문에 영향은 즉시 확산되지 않음</header>
    <nav className={styles.controls} aria-label="금융 네트워크 조작"><div className={styles.modes} role="group" aria-label="관계 표시 방식">
      <button type="button" aria-pressed={mode === "payments"} onClick={() => { setMode("payments"); setActiveId(null); }}>지급</button><button type="button" aria-pressed={mode === "debt"} onClick={() => { setMode("debt"); setActiveId(null); }}>채무</button>
    </div>{reduced ? <button type="button" onClick={() => { stepEconomy(economy.current, 1); redraw(); }}>한 걸음</button> : <button type="button" onClick={() => { running.current = !running.current; setPaused(!running.current); }}>{paused ? "재생" : "일시정지"}</button>}<button type="button" onClick={release} disabled={!selected.length}>모두 해제</button><button type="button" onClick={reset}>reset</button></nav>
    <div className={styles.viewport}><svg className={styles.graph} viewBox={`${view.x} ${view.y} ${graphWidth} ${graphHeight}`} role="group" aria-label={`${mode === "payments" ? "지급" : "채무"} 관계도`}
      onPointerDown={(event) => { if (event.target === event.currentTarget) drag.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }; }}
      onPointerMove={(event) => { if (!drag.current) return; const rect = event.currentTarget.getBoundingClientRect(); const unit = graphWidth / rect.width; const x = Math.max(0, Math.min(GRAPH_SIZE.width - graphWidth, drag.current.viewX - (event.clientX - drag.current.x) * unit)); const y = Math.max(0, Math.min(GRAPH_SIZE.height - graphHeight, drag.current.viewY - (event.clientY - drag.current.y) * unit)); setView((current) => ({ ...current, x, y })); }} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
      <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path fill="context-stroke" d="M 0 0 L 7 3.5 L 0 7 z" /></marker></defs>
      <text className={styles.legend} x="30" y="52">{mode === "debt" ? "화살표 = 채무자 → 채권자 · 선 굵기 = 채무잔액 · 모형 단위" : "화살표 = 지급자 → 수취자 · 선 굵기 = 지급액 · 모형 단위/모형초"}</text>
      <g className={styles.edges}>{relations.map((edge) => { const path = relationPath(edge, points); const relevant = related(edge, focus); const from = economy.current.nodes.find((node) => node.id === edge.from)!; const to = economy.current.nodes.find((node) => node.id === edge.to)!; const labelPoint = relationLabelPoint(edge, points); const weight = mode === "payments" || edge.id.startsWith("impact:") ? Math.min(5, .7 + edge.flow * .9) : Math.min(5, .7 + edge.principal / 65); return <g key={edge.id} className={!relevant ? styles.dimmed : ""}>
        <path d={path} style={{ strokeWidth: edge.facility ? undefined : weight }} className={`${styles.edge} ${edge.inferred ? styles.deposit : ""} ${edge.facility ? styles.facility : ""} ${edge.arrears > .005 ? styles.arrears : ""} ${active?.id === edge.id ? styles.edgeActive : ""}`} markerEnd="url(#arrow)" />
        <text className={styles.edgeLabel} x={labelPoint.x} y={labelPoint.y} textAnchor="middle">{edge.label} {relationAmount(edge, mode)}</text><path d={path} className={styles.edgeTarget} tabIndex={0} aria-label={`${nodeLabel(from)}에서 ${nodeLabel(to)}: ${edge.label}, ${relationAmount(edge, mode)}`} onPointerEnter={() => setActiveId(edge.id)} onPointerLeave={() => setActiveId(null)} onFocus={() => setActiveId(edge.id)} onBlur={() => setActiveId(null)} />
      </g>; })}</g>
      <g className={styles.nodes}>{economy.current.nodes.map((node) => { const point = points.get(node.id)!; const actualIncoming = economy.current.edges.filter((edge) => edge.to === node.id && edge.kind !== "backstopDisbursement").reduce((sum, edge) => sum + edge.flow, 0); const referenceIncoming = reference.current.edges.filter((edge) => edge.to === node.id && edge.kind !== "backstopDisbursement").reduce((sum, edge) => sum + edge.flow, 0); const affected = !node.frozen && referenceIncoming > .01 && actualIncoming / referenceIncoming < .85; return <g key={node.id} className={`${focus && !neighbors.has(node.id) ? styles.dimmed : ""} ${node.frozen ? styles.frozen : ""} ${affected ? styles.affected : ""} ${node.defaulted ? styles.defaulted : ""}`} transform={`translate(${point.x} ${point.y})`}>
        <rect className={`${styles.nodeHit} ${styles[shape(node)]}`} x={node.sector === "household" ? -34 : -39} y="-15" width={node.sector === "household" ? 68 : 78} height="30" rx={node.sector === "household" ? 15 : 2} tabIndex={0} role="button" aria-pressed={node.frozen} aria-label={`${nodeLabel(node)}${node.frozen ? ", 유동성 정지됨" : ", 유동성 정지"}`} onClick={() => toggle(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(node.id); } }} onPointerEnter={() => setHovered(node.id)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)} />
        {node.sector === "bank" && <rect className={styles.bankInner} x="-34" y="-10" width="68" height="20" rx="1" />}<text className={styles.nodeLabel} textAnchor="middle" dominantBaseline="middle">{nodeLabel(node)}</text>{node.frozen && <text className={styles.cashSplit} textAnchor="middle" y="29">가용 {node.liquidCash.toFixed(1)} / 동결 {(node.cash - node.liquidCash).toFixed(1)}</text>}{affected && <text className={styles.shortfall} textAnchor="middle" y="29">수입 감소</text>}
      </g>; })}</g>
    </svg></div>
    <div className={styles.zoom} aria-label="확대와 이동"><button type="button" onClick={() => zoom(view.zoom + .15)} aria-label="확대">+</button><button type="button" onClick={() => zoom(view.zoom - .15)} aria-label="축소">−</button><button type="button" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}>맞춤</button></div>
    {selected.length > 0 && <aside className={styles.interaction} aria-live="polite"><b>{economy.current.nodes.filter((node) => node.frozen).map(nodeLabel).join(", ")}</b><span>동결 합계 {economy.current.nodes.filter((node) => node.frozen).reduce((sum, node) => sum + node.cash - node.liquidCash, 0).toFixed(1)} 모형 단위</span><span>해제는 손실을 되돌리지 않음</span></aside>}{readout && <aside className={styles.readout} aria-live="polite"><span>{nodeLabel(economy.current.nodes.find((node) => node.id === readout.from)!)} → {nodeLabel(economy.current.nodes.find((node) => node.id === readout.to)!)}</span><b>{readout.label} {relationAmount(readout, mode)}</b>{readout.arrears > .005 && <em>연체</em>}</aside>}<span className={styles.srOnly}>{revision}</span>
  </main>;
}
