"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  applyLiquidityShock,
  clearLiquidityShock,
  createFinancialNetwork,
  isShocked,
  NOMINAL_UNIT_MILLIONS,
  relationLabel,
  stepFinancialNetwork,
  summarizeNetwork,
  type FinancialActor,
  type FinancialNetworkState,
  type FinancialRelation,
  type NetworkPreset,
  type ShockPersistence,
} from "./model";
import {
  WORLD,
  edgeGeometry,
  layoutActors,
  pointOnCurve,
  relationRailWidth,
  relationShortLabel,
  type Point,
} from "./rendering";
import styles from "./financial-network.module.css";

type Layer = "payments" | "claims";
type ScreenRelationGeometry = {
  path: Path2D;
  pathLength: number;
  label: Point;
  end: Point;
  tangent: Point;
};
type TransactionTiming = { period: number; duration: number; offset: number };
type TransactionPulse = { progress: number; amount: number };
type TransactionRecord = { cycle: number; amount: number };
type SettlementStage = { dashOffset: number; edgeAlpha: number; arrowAlpha: number; labelAlpha: number };

const MODEL_INTERVAL = 50;
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

function nodeBox(actor: FinancialActor, expanded = false) {
  if (expanded) {
    if (actor.kind === "household") return { width: 64, height: 34, solid: false };
    if (actor.kind === "firm") return { width: 80, height: 40, solid: false };
    if (actor.kind === "bank") return { width: 96, height: 48, solid: true };
    if (actor.kind === "fund") return { width: 84, height: 40, solid: false };
    if (actor.kind === "treasury") return { width: 138, height: 44, solid: true };
    return { width: 152, height: 48, solid: true };
  }
  if (actor.kind === "household") return { width: 84, height: 42, solid: false };
  if (actor.kind === "firm") return { width: 108, height: 52, solid: false };
  if (actor.kind === "bank") return { width: 142, height: 64, solid: true };
  if (actor.kind === "fund") return { width: 120, height: 52, solid: false };
  if (actor.kind === "treasury") return { width: 200, height: 52, solid: true };
  return { width: 230, height: 56, solid: true };
}

function displayMoney(value: number) {
  return `${Math.round(value * NOMINAL_UNIT_MILLIONS)}M`;
}

function displayAmount(relation: FinancialRelation, claims: boolean) {
  return displayMoney(claims || relation.layer !== "payment" ? relation.outstanding : relation.actual);
}

function transactionDescription(relation: FinancialRelation) {
  const descriptions: Partial<Record<FinancialRelation["kind"], string>> = {
    wage: "WAGE",
    consumption: "SPEND",
    "supplier-payment": "SUPPLIER",
    tax: "TAX",
    procurement: "PROCURE",
    "debt-service": "DEBT",
    refinancing: "ROLL",
    "bank-income": "BANK",
    "interbank-funding": "IB FUND",
    repo: "REPO",
    "public-bill": "BILL",
  };
  return descriptions[relation.kind] ?? relationShortLabel(relation).toUpperCase();
}

function smoothstep(value: number) {
  const progress = Math.max(0, Math.min(1, value));
  return progress * progress * (3 - 2 * progress);
}

function settlementStage(progress: number): SettlementStage {
  // This is the directed influence sequence from overlay-2d-4, expressed as
  // an event-relative clock: invisible → traced → held → sequentially cleared.
  const trace = smoothstep((progress - 0.16) / 0.4);
  const clear = smoothstep((progress - 0.7) / 0.3);
  const edgeAlpha = progress < 0.11
    ? 0
    : progress < 0.16
      ? smoothstep((progress - 0.11) / 0.05) * 0.98
      : progress < 0.56
        ? 0.98
        : progress < 0.7
          ? 0.98 - smoothstep((progress - 0.56) / 0.14) * 0.2
          : 0.78 * (1 - clear);
  const arrival = progress < 0.5
    ? 0
    : progress < 0.57
      ? smoothstep((progress - 0.5) / 0.07) * 0.98
      : progress < 0.92
        ? 0.98 - smoothstep((progress - 0.57) / 0.35) * 0.2
        : 0.78 * (1 - smoothstep((progress - 0.92) / 0.08));
  return {
    dashOffset: progress < 0.16 ? 1 : progress < 0.56 ? 1 - trace : progress < 0.7 ? 0 : -clear,
    edgeAlpha,
    arrowAlpha: arrival,
    labelAlpha: arrival,
  };
}

function transactionTiming(relation: FinancialRelation, preset: NetworkPreset): TransactionTiming {
  let hash = 0;
  for (const character of relation.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const variation = (hash % 1_009) / 1_009;
  // Payment rails are not an always-on traffic animation. Every relation
  // receives an independently phased settlement window: a payment is a
  // discrete event, then the relation disappears until its next clearing.
  // A short independent cadence keeps the payment field visibly alive without
  // restoring an always-on mesh. The range is deliberately non-harmonic, so
  // settlement events do not converge into a shared beat.
  const expanded = preset === "expanded";
  // More household representatives create more independent settlements, not a
  // shared blink. A longer individual return interval retains roughly the same
  // simultaneous foreground density while total new settlements still rises.
  const period = expanded ? 3.42 + variation * 2.8 : 1.38 + variation * 1.8;
  return {
    period,
    duration: expanded ? 0.4 + ((hash >>> 10) % 181) / 1_000 : 0.52 + ((hash >>> 10) % 241) / 1_000,
    offset: (relation.phase * 0.47 + variation) * period,
  };
}

function transactionPulse(
  relation: FinancialRelation,
  timing: TransactionTiming,
  time: number,
  records: Map<string, TransactionRecord>,
): TransactionPulse | null {
  const elapsed = time + timing.offset;
  const cycle = Math.floor(elapsed / timing.period);
  const phase = elapsed - cycle * timing.period;
  if (phase > timing.duration || relation.actual < 0.06) return null;
  const record = records.get(relation.id);
  // Amount is sampled once, when this particular settlement starts. It does
  // not breathe with the 20 Hz model while the same transaction is on screen.
  if (!record || record.cycle !== cycle) {
    const next = { cycle, amount: relation.actual * timing.period };
    records.set(relation.id, next);
    return { progress: phase / timing.duration, amount: next.amount };
  }
  return { progress: phase / timing.duration, amount: record.amount };
}

function riskValueForActor(state: FinancialNetworkState, actor: FinancialActor) {
  const arrearsRisk = actor.arrears / Math.max(actor.liquidityNeed * 4, 1);
  return Math.max(actor.stress, arrearsRisk, isShocked(state, actor) ? actor.shockSeverity : 0);
}

function riskIntervalForValue(risk: number, fractured = false) {
  if (fractured || risk >= 0.7) return 0.1;
  if (risk >= 0.4) return 0.2;
  if (risk >= 0.2) return 0.4;
  return null;
}

function riskIntervalForActor(state: FinancialNetworkState, actor: FinancialActor) {
  return riskIntervalForValue(riskValueForActor(state, actor), actor.fractured);
}

function riskIntervalForRelation(
  state: FinancialNetworkState,
  relation: FinancialRelation,
  actors: ReadonlyMap<string, FinancialActor>,
) {
  const from = actors.get(relation.from);
  const to = actors.get(relation.to);
  const relationRisk = relation.arrears / Math.max(
    relation.layer === "payment" ? relation.baseline * 4 : relation.outstanding,
    1,
  );
  const risk = Math.max(
    relationRisk,
    from ? riskValueForActor(state, from) : 0,
    to ? riskValueForActor(state, to) : 0,
  );
  return riskIntervalForValue(risk, !!from?.fractured || !!to?.fractured);
}

function riskPulseIsOn(time: number, interval: number) {
  // Matches /4's two-state threat clock: the stated interval is the time
  // between normal and alert backgrounds, not an always-red severity colour.
  return Math.floor(time / interval) % 2 === 1;
}

function nodeLedger(actor: FinancialActor, ledgerValue: number) {
  if (actor.kind === "firm") {
    return `C ${displayMoney(actor.cash)}  D ${displayMoney(ledgerValue)}`;
  }
  if (actor.kind === "bank") {
    return `C ${displayMoney(actor.cash)}  L ${displayMoney(ledgerValue)}`;
  }
  if (actor.kind === "fund") return `C ${displayMoney(actor.cash)}  A ${displayMoney(actor.collateral)}`;
  if (actor.kind === "household") return `C ${displayMoney(actor.cash)}  D ${displayMoney(actor.arrears)}`;
  return `C ${displayMoney(actor.cash)}  A ${displayMoney(actor.arrears)}`;
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
    const staticCanvas = document.createElement("canvas");
    const staticContext = staticCanvas.getContext("2d", { alpha: false });
    if (!canvas || !context || !staticContext) return;
    let width = 1;
    let height = 1;
    let ratio = 1;
    let frame: number | undefined;
    let stopped = false;
    let lastPointerCheck = 0;
    let presentationTime = network.current.time;
    let observedModelTime = network.current.time;
    let observedModelAt = performance.now();
    let staticDirty = true;
    let staticModelTime = Number.NaN;
    let staticClaims = false;
    let staticSelected: string | null = null;
    let staticPaintAt = Number.NEGATIVE_INFINITY;
    const geometryByRelation = new Map<string, ReturnType<typeof edgeGeometry>>();
    const screenGeometryByRelation = new Map<string, ScreenRelationGeometry>();
    const initialState = network.current;
    const expanded = initialState.preset === "expanded";
    const paymentRelations = initialState.relations.filter((relation) => relation.layer === "payment");
    const claimRelations = initialState.relations.filter((relation) => relation.layer === "claim" || relation.layer === "facility");
    const relationCodes = new Map<string, string>();
    for (const [index, relation] of paymentRelations.entries()) relationCodes.set(relation.id, `P${String(index + 1).padStart(2, "0")}`);
    for (const [index, relation] of claimRelations.entries()) relationCodes.set(relation.id, `C${String(index + 1).padStart(2, "0")}`);
    const timingByRelation = new Map(paymentRelations.map((relation) => [relation.id, transactionTiming(relation, initialState.preset)]));
    const transactionRecords = new Map<string, TransactionRecord>();
    const activeTransactions = new Map<string, TransactionPulse>();
    const actorsById = new Map(initialState.actors.map((actor) => [actor.id, actor]));
    const ledgerValues = new Map<string, number>();

    const fieldTransform = () => {
      if (!expanded) return { scale: width / WORLD.width, x: 0, y: 0 };
      // A radial field must remain circular on a wide browser. The compact
      // composition keeps its existing full-frame transform; the expanded
      // composition is fitted uniformly in the available field.
      const scale = Math.min(width / WORLD.width, height / WORLD.height);
      return { scale, x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2 };
    };
    const toScreen = (point: Point): Point => {
      const transform = fieldTransform();
      return { x: transform.x + point.x * transform.scale, y: transform.y + point.y * transform.scale };
    };
    const toWorld = (point: Point): Point => {
      const transform = fieldTransform();
      return { x: (point.x - transform.x) / transform.scale, y: (point.y - transform.y) / transform.scale };
    };

    const labelPointFor = (curve: ReturnType<typeof edgeGeometry>, relation: FinancialRelation) => {
      let hash = 0;
      for (const character of relation.id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
      const direction = hash % 2 === 0 ? 1 : -1;
      // Relation labels are data, not decorative text. Pick one stable place
      // on the fixed curve that clears a ledger box before accepting it; this
      // protects node cash/debt readouts in the denser circular preset.
      for (const [time, offset] of [[0.5, 15], [0.42, 20], [0.58, 20], [0.34, 25], [0.66, 25]] as const) {
        const point = toScreen(pointOnCurve(curve, time));
        const next = toScreen(pointOnCurve(curve, Math.min(1, time + 0.025)));
        const length = Math.max(0.001, Math.hypot(next.x - point.x, next.y - point.y));
        const candidate = {
          x: point.x - (next.y - point.y) / length * offset * direction,
          y: point.y + (next.x - point.x) / length * offset * direction,
        };
        const clearOfLedgers = initialState.actors.every((actor) => {
          const actorPoint = layout.current.get(actor.id);
          if (!actorPoint) return true;
          const actorScreen = toScreen(actorPoint);
          const box = nodeBox(actor, expanded);
          const boxWidth = box.width * fieldTransform().scale;
          const boxHeight = box.height * fieldTransform().scale;
          return Math.abs(candidate.x - actorScreen.x) > boxWidth / 2 + 48 ||
            Math.abs(candidate.y - actorScreen.y) > boxHeight / 2 + 11;
        });
        if (clearOfLedgers) return candidate;
      }
      return toScreen(pointOnCurve(curve, 0.5));
    };

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
      staticCanvas.width = canvas.width;
      staticCanvas.height = canvas.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      staticContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      screenGeometryByRelation.clear();
      staticDirty = true;
    };

    const geometryFor = (relation: FinancialRelation) => {
      const cached = geometryByRelation.get(relation.id);
      if (cached) return cached;
      const geometry = edgeGeometry(relation, layout.current, expanded);
      geometryByRelation.set(relation.id, geometry);
      return geometry;
    };

    const screenGeometryFor = (relation: FinancialRelation) => {
      const cached = screenGeometryByRelation.get(relation.id);
      if (cached) return cached;
      const curve = geometryFor(relation);
      const start = toScreen(curve.start);
      const controlA = toScreen(curve.controlA);
      const controlB = toScreen(curve.controlB);
      const end = toScreen(curve.end);
      const tangentLength = Math.max(0.001, Math.hypot(end.x - controlB.x, end.y - controlB.y));
      const path = new Path2D();
      path.moveTo(start.x, start.y);
      path.bezierCurveTo(controlA.x, controlA.y, controlB.x, controlB.y, end.x, end.y);
      let pathLength = 0;
      let previous = start;
      for (let index = 1; index <= 20; index += 1) {
        const point = toScreen(pointOnCurve(curve, index / 20));
        pathLength += Math.hypot(point.x - previous.x, point.y - previous.y);
        previous = point;
      }
      const screenGeometry = {
        path,
        pathLength: Math.max(1, pathLength),
        label: labelPointFor(curve, relation),
        end,
        tangent: { x: (end.x - controlB.x) / tangentLength, y: (end.y - controlB.y) / tangentLength },
      };
      screenGeometryByRelation.set(relation.id, screenGeometry);
      return screenGeometry;
    };

    const drawRail = (
      target: CanvasRenderingContext2D,
      relation: FinancialRelation,
      colour: string,
      lineWidth: number,
      opacity: number,
    ) => {
      const geometry = screenGeometryFor(relation);
      const x = geometry.tangent.x;
      const y = geometry.tangent.y;
      const arrow = Math.max(4, Math.min(7.2, lineWidth * 1.4 + 2.4));
      const end = { x: geometry.end.x - x * 1.5, y: geometry.end.y - y * 1.5 };
      target.strokeStyle = colour;
      target.lineWidth = lineWidth;
      target.globalAlpha = opacity;
      target.stroke(geometry.path);
      target.beginPath();
      target.moveTo(end.x, end.y);
      target.lineTo(end.x - x * arrow - y * arrow * 0.58, end.y - y * arrow + x * arrow * 0.58);
      target.lineTo(end.x - x * arrow + y * arrow * 0.58, end.y - y * arrow - x * arrow * 0.58);
      target.closePath();
      target.fillStyle = colour;
      target.fill();
      target.globalAlpha = 1;
    };

    const drawTransaction = (
      target: CanvasRenderingContext2D,
      relation: FinancialRelation,
      pulse: TransactionPulse,
      colour: string,
    ) => {
      const geometry = screenGeometryFor(relation);
      // This is deliberately linear rather than a category styling rule: an
      // 80M settlement is physically twice as wide as a 40M settlement.
      const lineWidth = Math.max(1.7, Math.min(14.8, pulse.amount * 0.86)) * fieldTransform().scale;
      const stage = settlementStage(pulse.progress);
      const x = geometry.tangent.x;
      const y = geometry.tangent.y;
      const arrow = Math.max(5.5, Math.min(12, lineWidth * 2.6 + 3.4));
      const end = { x: geometry.end.x - x * 1.5, y: geometry.end.y - y * 1.5 };
      // The transaction path is a fixed financial relation: its cubic shape
      // and money-derived width never morph. The cached dash phase reveals
      // that exact curve from payer to receiver, as in overlay-2d's directed
      // trace, then the terminal arrow and transaction label arrive.
      target.globalAlpha = 0.16 + stage.edgeAlpha * 0.84;
      target.strokeStyle = colour;
      target.lineWidth = lineWidth;
      target.setLineDash([geometry.pathLength, geometry.pathLength]);
      target.lineDashOffset = geometry.pathLength * stage.dashOffset;
      target.stroke(geometry.path);
      target.setLineDash([]);
      if (stage.arrowAlpha > 0.01) {
        target.globalAlpha = stage.arrowAlpha;
        target.beginPath();
        target.moveTo(end.x, end.y);
        target.lineTo(end.x - x * arrow - y * arrow * 0.58, end.y - y * arrow + x * arrow * 0.58);
        target.lineTo(end.x - x * arrow + y * arrow * 0.58, end.y - y * arrow - x * arrow * 0.58);
        target.closePath();
        target.fillStyle = colour;
        target.fill();
      }
      target.globalAlpha = 1;
    };

    const visualTime = () => {
      const now = performance.now();
      const modelTime = network.current.time;
      if (modelTime !== observedModelTime) {
        observedModelTime = modelTime;
        observedModelAt = now;
      }
      // The model remains an explicit 20 Hz stock-flow system. Rendering
      // interpolates only its presentation clock, so a settlement trace has a
      // continuous phase without adding simulation steps or state churn.
      return modelTime + Math.min(MODEL_INTERVAL / 1_000, (now - observedModelAt) / 1_000);
    };

    const drawNode = (
      target: CanvasRenderingContext2D,
      actor: FinancialActor,
      selected: string | null,
      alertBackground: boolean,
    ) => {
      const point = layout.current.get(actor.id);
      if (!point) return;
      const screen = toScreen(point);
      const box = nodeBox(actor, expanded);
      const boxWidth = box.width * fieldTransform().scale;
      const boxHeight = box.height * fieldTransform().scale;
      const selectedActor = selected === actor.id;
      target.save();
      target.fillStyle = alertBackground ? "#c53d31" : box.solid ? "#171714" : "#fafaf7";
      target.strokeStyle = alertBackground ? "#ffd0d4" : "#171714";
      target.lineWidth = alertBackground ? Math.max(1.6, selectedActor ? 2.8 : 1.7) : selectedActor ? 2.8 : 1.35;
      target.fillRect(screen.x - boxWidth / 2, screen.y - boxHeight / 2, boxWidth, boxHeight);
      target.strokeRect(screen.x - boxWidth / 2, screen.y - boxHeight / 2, boxWidth, boxHeight);
      const fontSize = expanded
        ? Math.max(actor.kind === "household" ? 7.5 : 8.4, Math.min(13, boxHeight * 0.33))
        : Math.max(actor.kind === "household" ? 10 : 11, Math.min(16, boxHeight * 0.37));
      target.fillStyle = alertBackground || box.solid ? "#fafaf7" : "#171714";
      target.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
      target.textAlign = "center";
      target.textBaseline = "middle";
      target.fillText(nodeIdentifier(actor), screen.x, screen.y - Math.max(5, boxHeight * 0.15));
      target.font = `600 ${expanded ? Math.max(6.8, fontSize * 0.66) : Math.max(8.5, fontSize * 0.7)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      target.fillText(nodeLedger(actor, ledgerValues.get(actor.id) ?? 0), screen.x, screen.y + Math.max(7, boxHeight * 0.19));
      target.restore();
    };

    const drawStaticField = (
      state: FinancialNetworkState,
      claims: boolean,
      selected: string | null,
      relations: readonly FinancialRelation[],
      relationCode: (relation: FinancialRelation) => string,
    ) => {
      staticContext.fillStyle = "#fafaf7";
      staticContext.fillRect(0, 0, width, height);
      staticContext.globalAlpha = 1;
      staticContext.lineCap = "round";
      staticContext.lineJoin = "round";

      ledgerValues.clear();
      for (const relation of state.relations) {
        if (relation.kind === "loan-stock") {
          ledgerValues.set(relation.from, (ledgerValues.get(relation.from) ?? 0) + relation.outstanding);
          ledgerValues.set(relation.to, (ledgerValues.get(relation.to) ?? 0) + relation.outstanding);
        }
        if (relation.kind === "interbank-credit") {
          ledgerValues.set(relation.to, (ledgerValues.get(relation.to) ?? 0) + relation.outstanding);
        }
      }

      for (const relation of relations) {
        const railWidth = Math.max(
          1.2,
          relationRailWidth(relation, claims) * 2,
        ) * fieldTransform().scale;
        drawRail(staticContext, relation, "#777772", railWidth, 0.3);
      }

      if (claims) {
        staticContext.font = `700 ${Math.max(9, Math.min(11, width / 140))}px Arial, Helvetica, sans-serif`;
        staticContext.textAlign = "center";
        staticContext.textBaseline = "middle";
        staticContext.lineWidth = 3;
        staticContext.strokeStyle = "#fafaf7";
        for (const relation of relations) {
          const label = screenGeometryFor(relation).label;
          const text = `${displayAmount(relation, true)}  ${relationCode(relation)}`;
          staticContext.strokeText(text, label.x, label.y);
          staticContext.fillStyle = "#575752";
          staticContext.fillText(text, label.x, label.y);
        }
      }

      for (const actor of state.actors) drawNode(staticContext, actor, selected, false);
    };

    const draw = () => {
      if (stopped) return;
      if (!document.hidden) {
        const state = network.current;
        presentationTime = visualTime();
        const claims = claimsRef.current;
        const selected = selectedRef.current;
        const activeRelationId = activeRelationRef.current;
        const relations = claims ? claimRelations : paymentRelations;
        const relationCode = (relation: FinancialRelation) => relationCodes.get(relation.id) ?? "—";

        const modelRefreshDue = staticModelTime !== state.time &&
          performance.now() - staticPaintAt >= (expanded ? 1_000 / 12 : 0);
        if (staticDirty || staticClaims !== claims || staticSelected !== selected || modelRefreshDue) {
          drawStaticField(state, claims, selected, relations, relationCode);
          staticDirty = false;
          staticModelTime = state.time;
          staticClaims = claims;
          staticSelected = selected;
          staticPaintAt = performance.now();
        }

        context.globalAlpha = 1;
        context.drawImage(staticCanvas, 0, 0, staticCanvas.width, staticCanvas.height, 0, 0, width, height);
        context.lineCap = "round";
        context.lineJoin = "round";

        for (const actor of state.actors) {
          const interval = riskIntervalForActor(state, actor);
          if (interval && riskPulseIsOn(presentationTime, interval)) {
            drawNode(context, actor, selected, true);
          }
        }

        activeTransactions.clear();
        if (!claims) {
          for (const relation of paymentRelations) {
            const timing = timingByRelation.get(relation.id);
            if (!timing) continue;
            const pulse = transactionPulse(relation, timing, presentationTime, transactionRecords);
            if (!pulse) continue;
            activeTransactions.set(relation.id, pulse);
            const interval = riskIntervalForRelation(state, relation, actorsById);
            const alert = !!interval && riskPulseIsOn(presentationTime, interval);
            drawTransaction(context, relation, pulse, alert ? "#c53d31" : "#171714");
          }

          context.font = `700 ${Math.max(9, Math.min(11, width / 140))}px Arial, Helvetica, sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.lineWidth = 3;
          context.strokeStyle = "#fafaf7";
          for (const relation of paymentRelations) {
            const transaction = activeTransactions.get(relation.id);
            const stage = transaction ? settlementStage(transaction.progress) : null;
            if (!transaction || !stage || stage.labelAlpha <= 0.01) continue;
            const label = screenGeometryFor(relation).label;
            const text = `${relationCode(relation)}  ${transactionDescription(relation)}  ${displayMoney(transaction.amount)}`;
            const interval = riskIntervalForRelation(state, relation, actorsById);
            const alert = !!interval && riskPulseIsOn(presentationTime, interval);
            context.globalAlpha = stage.labelAlpha;
            context.strokeText(text, label.x, label.y);
            context.fillStyle = alert ? "#c53d31" : "#575752";
            context.fillText(text, label.x, label.y);
          }
          context.globalAlpha = 1;
        }

        const active = activeRelationId ? relations.find((relation) => relation.id === activeRelationId) : null;
        const activeTransaction = active && !claims ? activeTransactions.get(active.id) : null;
        if (active && (claims || activeTransaction)) {
          const label = screenGeometryFor(active).label;
          context.save();
          context.fillStyle = "#171714";
          context.font = `700 ${Math.max(12, width / 100)}px Arial, Helvetica, sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "bottom";
          const amount = activeTransaction ? displayMoney(activeTransaction.amount) : displayAmount(active, true);
          context.fillText(`${relationCode(active)}  ${relationShortLabel(active).toUpperCase()}  ${amount}`, label.x, label.y - 10);
          context.restore();
        }
      }
      frame = window.requestAnimationFrame(draw);
    };

    const nodeAt = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = toWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      for (const actor of [...network.current.actors].reverse()) {
        const point = layout.current.get(actor.id);
        if (!point) continue;
        const box = nodeBox(actor, expanded);
        if (Math.abs(pointer.x - point.x) <= box.width / 2 && Math.abs(pointer.y - point.y) <= box.height / 2) return actor;
      }
      return null;
    };

    const relationAt = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const pointer = toWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      const claims = claimsRef.current;
      const relations = claims ? claimRelations : paymentRelations;
      let closest: FinancialRelation | null = null;
      let distance = 15;
      for (const relation of relations) {
        if (!claims) {
          const timing = timingByRelation.get(relation.id);
          if (!timing || !transactionPulse(relation, timing, presentationTime, transactionRecords)) continue;
        }
        const geometry = geometryFor(relation);
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
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("click", click);
    };
  }, [activeRelationRef, claimsRef, layout, network, onActorClick, onFocusChange, resetVersion, selectedRef]);

  return <canvas aria-label="A fixed financial network. Every arrow is a directed payment or claim relation; its label gives the current amount in millions of nominal currency units and its line width follows that amount. Click a numbered actor to apply or remove a liquidity shock." className={styles.canvas} ref={canvasRef} role="application" tabIndex={0} />;
}

export default function FinancialNetworkTwo() {
  const network = useRef(createFinancialNetwork("compact"));
  const layout = useRef(layoutActors(network.current.actors));
  const running = useRef(true);
  const claimsRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const activeRelationRef = useRef<string | null>(null);
  const [layer, setLayer] = useState<Layer>("payments");
  const [preset, setPreset] = useState<NetworkPreset>("compact");
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

  const resetNetwork = useCallback((nextPreset: NetworkPreset) => {
    network.current = createFinancialNetwork(nextPreset);
    layout.current = layoutActors(network.current.actors);
    selectedRef.current = null;
    activeRelationRef.current = null;
    setSelectedId(null);
    setActiveRelationId(null);
    setResetVersion((value) => value + 1);
    setReadoutVersion((value) => value + 1);
  }, []);

  const restart = useCallback(() => {
    resetNetwork(preset);
  }, [preset, resetNetwork]);

  const switchPreset = useCallback((nextPreset: NetworkPreset) => {
    if (nextPreset === preset) return;
    setPreset(nextPreset);
    resetNetwork(nextPreset);
  }, [preset, resetNetwork]);

  const summary = summarizeNetwork(network.current);
  const activeRelation = activeRelationId
    ? network.current.relations.find((relation) => relation.id === activeRelationId) ?? null
    : null;
  const activeSettlement = activeRelation && layer === "payments"
    ? transactionPulse(activeRelation, transactionTiming(activeRelation, network.current.preset), network.current.time, new Map())
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
    <button aria-label={`Switch to ${preset === "compact" ? "20" : "8"}-sector network`} className={styles.scaleButton} onClick={() => switchPreset(preset === "compact" ? "expanded" : "compact")} type="button">{preset === "compact" ? "20 sectors" : "8 sectors"}</button>
    <footer className={styles.readout} aria-live="polite">
      {selected ? <span>{nodeIdentifier(selected)} · CASH {displayMoney(selected.cash)} · ARREARS {displayMoney(selected.arrears)}</span> : <span>FLOW {displayMoney(network.current.relations.filter((relation) => relation.layer === "payment").reduce((total, relation) => total + relation.actual, 0))}</span>}
      <span>ROLLOVER {Math.round(summary.refinancingIndex * 100)}%</span>
      <span>COLLATERAL {Math.round(summary.assetPrice * 100)}</span>
      <span className={summary.fractured ? styles.failure : undefined}>FRACTURED {summary.fractured}</span>
      {activeRelation && (layer === "claims" || activeSettlement)
        ? <span>{relationLabel(activeRelation.kind).toUpperCase()} · {activeSettlement ? displayMoney(activeSettlement.amount) : displayAmount(activeRelation, true)}</span>
        : null}
    </footer>
    <div className={styles.srOnly}>{network.current.actors.map((actor) => <button key={actor.id} onClick={() => toggleActorShock(actor.id)} type="button">{nodeIdentifier(actor)}, {actorType[actor.kind]}</button>)}</div>
  </main>;
}
