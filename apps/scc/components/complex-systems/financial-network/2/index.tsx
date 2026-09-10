"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  applyLiquidityShock,
  clearLiquidityShock,
  createFinancialNetwork,
  isShocked,
  relationLabel,
  stepFinancialNetwork,
  summarizeNetwork,
  type FinancialActor,
  type FinancialNetworkState,
  type FinancialRelation,
  type ShockPersistence,
} from "./model";
import {
  WORLD,
  edgeGeometry,
  layoutActors,
  pointOnCurve,
  primaryRelations,
  relationShortLabel,
  strokeWidth,
  type Point,
} from "./rendering";
import styles from "./financial-network.module.css";

type Layer = "payments" | "claims";

const MODEL_INTERVAL = 50;
const PAINT_INTERVAL = 100;
const shockByLevel = [0.24, 0.42, 0.6, 0.78] as const;

const actorType: Record<FinancialActor["kind"], string> = {
  household: "household",
  firm: "firm",
  bank: "bank",
  fund: "fund",
  treasury: "treasury",
  "central-bank": "central bank",
};

const canShock = (actor: FinancialActor) => actor.kind !== "treasury" && actor.kind !== "central-bank";

function nodeIdentifier(actor: FinancialActor) {
  const number = actor.id.match(/(\d+)$/)?.[1];
  if (actor.kind === "household") return `H${number?.padStart(2, "0") ?? ""}`;
  if (actor.kind === "firm") return `F${number?.padStart(2, "0") ?? ""}`;
  if (actor.kind === "bank") return `BANK ${number?.padStart(2, "0") ?? ""}`;
  if (actor.kind === "fund") return `FUND ${number?.padStart(2, "0") ?? ""}`;
  if (actor.kind === "treasury") return "TREASURY";
  return "CENTRAL BANK";
}

function nodeBox(actor: FinancialActor) {
  if (actor.kind === "household") return { width: 70, height: 30, solid: false };
  if (actor.kind === "firm") return { width: 92, height: 46, solid: false };
  if (actor.kind === "bank") return { width: 138, height: 64, solid: true };
  if (actor.kind === "fund") return { width: 112, height: 48, solid: false };
  if (actor.kind === "treasury") return { width: 192, height: 46, solid: true };
  return { width: 224, height: 52, solid: true };
}

function displayAmount(relation: FinancialRelation, claims: boolean) {
  return Math.round(claims || relation.layer !== "payment" ? relation.outstanding : relation.actual);
}

function relationInk(relation: FinancialRelation) {
  return relation.arrears > 0.02 ? "#c53d31" : "#292925";
}

function pointDistanceToSegment(point: Point, from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 0.001) return Math.hypot(point.x - from.x, point.y - from.y);
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

function FinancialCanvas({
  activeRelationRef,
  claimsRef,
  layout,
  network,
  onActorClick,
  onFocusChange,
  resetVersion,
  selectedRef,
}: {
  activeRelationRef: MutableRefObject<string | null>;
  claimsRef: MutableRefObject<boolean>;
  layout: MutableRefObject<ReturnType<typeof layoutActors>>;
  network: MutableRefObject<FinancialNetworkState>;
  onActorClick: (actorId: string) => void;
  onFocusChange: (actorId: string | null, relationId: string | null) => void;
  resetVersion: number;
  selectedRef: MutableRefObject<string | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;
    const trace = document.createElement("canvas");
    const traceContext = trace.getContext("2d", { alpha: false });
    if (!traceContext) return;
    let width = 1;
    let height = 1;
    let ratio = 1;
    let timer: number | undefined;
    let stopped = false;
    let lastPointerCheck = 0;

    const toScreen = (point: Point): Point => ({ x: point.x / WORLD.width * width, y: point.y / WORLD.height * height });
    const toWorld = (point: Point): Point => ({ x: point.x / width * WORLD.width, y: point.y / height * WORLD.height });

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      // The scene is deliberately light enough to retain the screen's native
      // pixel density. The prior fixed 1x backing store made every line and
      // numeral soft on a Retina display.
      ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      trace.width = canvas.width;
      trace.height = canvas.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      traceContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      traceContext.fillStyle = "#fafaf7";
      traceContext.fillRect(0, 0, width, height);
    };

    const drawArrow = (relation: FinancialRelation, colour: string, lineWidth: number) => {
      const curve = edgeGeometry(relation, layout.current);
      const from = toScreen(curve.start);
      const controlA = toScreen(curve.controlA);
      const controlB = toScreen(curve.controlB);
      const to = toScreen(curve.end);
      const distance = Math.max(0.001, Math.hypot(to.x - controlB.x, to.y - controlB.y));
      const x = (to.x - controlB.x) / distance;
      const y = (to.y - controlB.y) / distance;
      const arrow = Math.max(4.8, Math.min(10.5, lineWidth * 2.4 + 3.6));
      const end = { x: to.x - x * 1.5, y: to.y - y * 1.5 };
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.bezierCurveTo(controlA.x, controlA.y, controlB.x, controlB.y, end.x, end.y);
      context.strokeStyle = colour;
      context.lineWidth = lineWidth;
      context.globalAlpha = 0.72;
      context.stroke();
      context.beginPath();
      context.moveTo(end.x, end.y);
      context.lineTo(end.x - x * arrow - y * arrow * 0.58, end.y - y * arrow + x * arrow * 0.58);
      context.lineTo(end.x - x * arrow + y * arrow * 0.58, end.y - y * arrow - x * arrow * 0.58);
      context.closePath();
      context.fillStyle = colour;
      context.fill();
    };

    const drawSettlement = (relation: FinancialRelation, claims: boolean) => {
      if (claims || relation.layer !== "payment" || relation.actual < 0.06) return;
      const curve = edgeGeometry(relation, layout.current);
      const intensity = relation.actual / Math.max(0.12, relation.baseline);
      const phase = (network.current.time * (0.72 + intensity * 0.8) + relation.phase * 0.17) % 1;
      const end = Math.min(1, phase + 0.22 + Math.min(0.2, intensity * 0.08));
      traceContext.beginPath();
      for (let index = 0; index <= 10; index += 1) {
        const point = toScreen(pointOnCurve(curve, phase + (end - phase) * index / 10));
        if (index === 0) traceContext.moveTo(point.x, point.y);
        else traceContext.lineTo(point.x, point.y);
      }
      traceContext.strokeStyle = relationInk(relation);
      traceContext.globalAlpha = relation.arrears > 0.02 ? 0.72 : 0.54;
      traceContext.lineWidth = Math.max(1.25, strokeWidth(relation, false) * width / WORLD.width * 2.4);
      traceContext.lineCap = "round";
      traceContext.stroke();
    };

    const draw = () => {
      if (stopped) return;
      if (!document.hidden) {
        const state = network.current;
        const claims = claimsRef.current;
        const selected = selectedRef.current;
        const activeRelationId = activeRelationRef.current;
        const relations = primaryRelations(state, claims, null);
        traceContext.save();
        traceContext.globalAlpha = 1;
        traceContext.fillStyle = "rgb(250 250 247 / 13%)";
        traceContext.fillRect(0, 0, width, height);
        for (const relation of relations) drawSettlement(relation, claims);
        traceContext.restore();

        context.fillStyle = "#fafaf7";
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
        context.drawImage(trace, 0, 0, width, height);
        context.lineCap = "round";
        context.lineJoin = "round";

        const actorsById = new Map(state.actors.map((actor) => [actor.id, actor]));
        for (const relation of relations) {
          const relevant = !selected || relation.from === selected || relation.to === selected;
          const payer = actorsById.get(relation.from);
          const payerStress = payer?.stress ?? 0;
          const shockScale = payer && isShocked(state, payer)
            ? Math.max(0.14, 1 - payer.shockSeverity * 0.84)
            : Math.max(0.22, 1 - Math.max(0, payerStress - 0.16) * 0.78);
          const underPressure = relation.arrears > 0.02 || payerStress > 0.34 || !!(payer && isShocked(state, payer));
          const lineWidth = Math.max(0.8, strokeWidth(relation, claims) * width / WORLD.width * shockScale);
          context.save();
          context.globalAlpha = relevant ? 1 : 0.1;
          drawArrow(relation, underPressure ? "#c53d31" : relationInk(relation), lineWidth);
          context.restore();
        }

        for (const actor of state.actors) {
          const point = layout.current.get(actor.id);
          if (!point) continue;
          const screen = toScreen(point);
          const box = nodeBox(actor);
          const boxWidth = box.width * width / WORLD.width;
          const boxHeight = box.height * width / WORLD.width;
          const selectedActor = selected === actor.id;
          const shocked = isShocked(state, actor);
          context.save();
          context.globalAlpha = !selected || selectedActor || relations.some((relation) => (relation.from === selected && relation.to === actor.id) || (relation.to === selected && relation.from === actor.id)) ? 1 : 0.16;
          if (actor.stress > 0.16) {
            context.strokeStyle = "#c53d31";
            context.globalAlpha *= 0.48;
            context.lineWidth = 1.15;
            context.strokeRect(screen.x - boxWidth / 2 - 6, screen.y - boxHeight / 2 - 6, boxWidth + 12, boxHeight + 12);
            context.globalAlpha = 1;
          }
          context.fillStyle = shocked ? "#f1d9d5" : box.solid ? "#171714" : "#fafaf7";
          context.strokeStyle = shocked ? "#c53d31" : "#171714";
          context.lineWidth = selectedActor ? 2.7 : 1.7;
          context.fillRect(screen.x - boxWidth / 2, screen.y - boxHeight / 2, boxWidth, boxHeight);
          context.strokeRect(screen.x - boxWidth / 2, screen.y - boxHeight / 2, boxWidth, boxHeight);
          const fontSize = Math.max(actor.kind === "household" ? 11 : 12, Math.min(17, boxHeight * 0.39));
          context.fillStyle = box.solid && !shocked ? "#fafaf7" : "#171714";
          context.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(nodeIdentifier(actor), screen.x, screen.y + 0.5);
          if (selectedActor) {
            context.fillStyle = "#c53d31";
            context.font = `700 ${Math.max(9, fontSize * 0.64)}px ui-monospace, monospace`;
            context.fillText(`CASH ${Math.round(actor.cash)}  ARREARS ${Math.round(actor.arrears)}`, screen.x, screen.y + boxHeight / 2 + 13);
          }
          context.restore();
        }

        const active = activeRelationId ? relations.find((relation) => relation.id === activeRelationId) : null;
        if (active) {
          const geometry = edgeGeometry(active, layout.current);
          const label = toScreen(geometry.label);
          context.save();
          context.fillStyle = "#171714";
          context.font = `700 ${Math.max(12, width / 100)}px Arial, Helvetica, sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "bottom";
          context.fillText(`${relationShortLabel(active).toUpperCase()}  ${displayAmount(active, claims)}`, label.x, label.y - 8);
          context.restore();
        }
      }
      timer = window.setTimeout(draw, PAINT_INTERVAL);
    };

    const nodeAt = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = toWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      for (const actor of [...network.current.actors].reverse()) {
        const point = layout.current.get(actor.id);
        if (!point) continue;
        const box = nodeBox(actor);
        if (Math.abs(pointer.x - point.x) <= box.width / 2 && Math.abs(pointer.y - point.y) <= box.height / 2) return actor;
      }
      return null;
    };

    const relationAt = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = toWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      const relations = primaryRelations(network.current, claimsRef.current, null);
      let closest: FinancialRelation | null = null;
      let distance = 15;
      for (const relation of relations) {
        const geometry = edgeGeometry(relation, layout.current);
        let previous = geometry.start;
        for (let sample = 1; sample <= 14; sample += 1) {
          const next = pointOnCurve(geometry, sample / 14);
          const nextDistance = pointDistanceToSegment(pointer, previous, next);
          if (nextDistance < distance) { distance = nextDistance; closest = relation; }
          previous = next;
        }
      }
      return closest;
    };

    const move = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastPointerCheck < 75) return;
      lastPointerCheck = now;
      const actor = nodeAt(event);
      const relation = actor ? null : relationAt(event);
      canvas.style.cursor = actor ? "pointer" : relation ? "crosshair" : "default";
      onFocusChange(actor?.id ?? null, relation?.id ?? null);
    };
    const click = (event: PointerEvent) => {
      const actor = nodeAt(event);
      if (actor) onActorClick(actor.id);
    };
    const leave = () => onFocusChange(null, null);

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("click", click);
    draw();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("click", click);
    };
  }, [activeRelationRef, claimsRef, layout, network, onActorClick, onFocusChange, resetVersion, selectedRef]);

  return <canvas aria-label="A fixed financial network. Every arrow is a directed payment or claim relation; line width is its current amount. Click a numbered actor to apply or remove a liquidity shock." className={styles.canvas} ref={canvasRef} role="application" tabIndex={0} />;
}

export default function FinancialNetworkTwo() {
  const network = useRef(createFinancialNetwork());
  const layout = useRef(layoutActors(network.current.actors));
  const running = useRef(true);
  const claimsRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const activeRelationRef = useRef<string | null>(null);
  const [layer, setLayer] = useState<Layer>("payments");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeRelationId, setActiveRelationId] = useState<string | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [shockLevel, setShockLevel] = useState(2);
  const [shockPersistence, setShockPersistence] = useState<ShockPersistence>("persistent");
  const [, setReadoutVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    claimsRef.current = layer === "claims";
  }, [layer]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    let readoutTicks = 0;
    const timer = window.setInterval(() => {
      if (document.hidden || preference.matches || !running.current) return;
      stepFinancialNetwork(network.current, 1 / 20);
      readoutTicks += 1;
      if (readoutTicks >= 5) { readoutTicks = 0; setReadoutVersion((value) => value + 1); }
    }, MODEL_INTERVAL);
    return () => { window.clearInterval(timer); preference.removeEventListener("change", updatePreference); };
  }, []);

  const toggleActorShock = useCallback((actorId: string) => {
    const actor = network.current.actors.find((candidate) => candidate.id === actorId);
    if (!actor) return;
    if (canShock(actor)) {
      if (isShocked(network.current, actor)) clearLiquidityShock(network.current, actor.id);
      else applyLiquidityShock(network.current, actor.id, shockByLevel[shockLevel]!, shockPersistence);
    }
    selectedRef.current = actor.id;
    setSelectedId(actor.id);
    setReadoutVersion((value) => value + 1);
  }, [shockLevel, shockPersistence]);

  const focusChange = useCallback((_actorId: string | null, relationId: string | null) => {
    if (activeRelationRef.current === relationId) return;
    activeRelationRef.current = relationId;
    setActiveRelationId(relationId);
  }, []);

  const release = useCallback(() => {
    for (const actor of network.current.actors) clearLiquidityShock(network.current, actor.id);
    setReadoutVersion((value) => value + 1);
  }, []);

  const restart = useCallback(() => {
    network.current = createFinancialNetwork();
    layout.current = layoutActors(network.current.actors);
    selectedRef.current = null;
    activeRelationRef.current = null;
    setSelectedId(null);
    setActiveRelationId(null);
    setResetVersion((value) => value + 1);
    setReadoutVersion((value) => value + 1);
  }, []);

  const summary = summarizeNetwork(network.current);
  const activeRelation = activeRelationId
    ? network.current.relations.find((relation) => relation.id === activeRelationId) ?? null
    : null;
  const selected = selectedId ? network.current.actors.find((actor) => actor.id === selectedId) ?? null : null;

  return <main className={styles.field}>
    <FinancialCanvas activeRelationRef={activeRelationRef} claimsRef={claimsRef} layout={layout} network={network} onActorClick={toggleActorShock} onFocusChange={focusChange} resetVersion={resetVersion} selectedRef={selectedRef} />
    <aside className={styles.controls}>
      <section className={styles.controlPanel} hidden={!controlsOpen} id="financial-network-controls" aria-label="Financial network controls">
        <div className={styles.actions}>
          <button aria-pressed={layer === "payments"} onClick={() => setLayer("payments")} type="button">payment</button>
          <button aria-pressed={layer === "claims"} onClick={() => setLayer("claims")} type="button">claim</button>
          <button aria-pressed={shockPersistence === "brief"} onClick={() => setShockPersistence("brief")} type="button">brief shock</button>
          <button aria-pressed={shockPersistence === "persistent"} onClick={() => setShockPersistence("persistent")} type="button">persistent shock</button>
          {[0, 1, 2, 3].map((level) => <button aria-pressed={shockLevel === level} key={level} onClick={() => setShockLevel(level)} type="button">shock {level + 1}</button>)}
        </div>
        <div className={styles.actions}>
          {reducedMotion ? <button onClick={() => { stepFinancialNetwork(network.current, 1); setReadoutVersion((value) => value + 1); }} type="button">step</button> : <button aria-pressed={paused} onClick={() => { running.current = !running.current; setPaused(!running.current); }} type="button">{paused ? "continue" : "pause"}</button>}
          <button onClick={release} type="button">release</button>
          <button onClick={restart} type="button">restart</button>
        </div>
      </section>
      <button aria-controls="financial-network-controls" aria-expanded={controlsOpen} className={styles.expandButton} onClick={() => setControlsOpen((open) => !open)} type="button">{controlsOpen ? "collapse" : "expand"}</button>
    </aside>
    <footer className={styles.readout} aria-live="polite">
      {selected ? <span>{nodeIdentifier(selected)} · CASH {Math.round(selected.cash)} · ARREARS {Math.round(selected.arrears)}</span> : <span>SETTLED {Math.round(network.current.relations.filter((relation) => relation.layer === "payment").reduce((total, relation) => total + relation.actual, 0))}</span>}
      <span>ROLLOVER {Math.round(summary.refinancingIndex * 100)}%</span>
      <span>COLLATERAL {Math.round(summary.assetPrice * 100)}</span>
      <span className={summary.fractured ? styles.failure : undefined}>FRACTURED {summary.fractured}</span>
      {activeRelation ? <span>{relationLabel(activeRelation.kind).toUpperCase()} · {displayAmount(activeRelation, layer === "claims")}</span> : null}
    </footer>
    <div className={styles.srOnly}>{network.current.actors.map((actor) => <button key={actor.id} onClick={() => toggleActorShock(actor.id)} type="button">{nodeIdentifier(actor)}, {actorType[actor.kind]}</button>)}</div>
  </main>;
}
