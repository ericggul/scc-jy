/**
 * Financial network / 2 is a deterministic stock-flow sketch, not a forecast
 * or a balance-sheet replica. The model keeps a normal, fluctuating payment
 * circuit alive until a liquidity shock becomes large enough to alter its
 * own refinancing, collateral and payment constraints.
 */

export type ActorKind =
  | "household"
  | "firm"
  | "bank"
  | "fund"
  | "treasury"
  | "central-bank";

export type RelationKind =
  | "wage"
  | "consumption"
  | "supplier-payment"
  | "tax"
  | "procurement"
  | "debt-service"
  | "refinancing"
  | "bank-income"
  | "repo"
  | "public-bill"
  | "loan-stock"
  | "deposit-stock"
  | "central-bank-facility";

export type RelationLayer = "payment" | "claim" | "facility";
export type ShockPersistence = "brief" | "persistent";

export type FinancialActor = {
  id: string;
  label: string;
  kind: ActorKind;
  community: number;
  cash: number;
  collateral: number;
  liquidityNeed: number;
  arrears: number;
  stress: number;
  shockedUntil: number;
  shockSeverity: number;
  fractured: boolean;
};

export type FinancialRelation = {
  id: string;
  from: string;
  to: string;
  kind: RelationKind;
  layer: RelationLayer;
  baseline: number;
  actual: number;
  outstanding: number;
  arrears: number;
  phase: number;
};

export type FinancialNetworkState = {
  time: number;
  actors: FinancialActor[];
  relations: FinancialRelation[];
  assetPrice: number;
  paymentIndex: number;
  refinancingIndex: number;
  systemStress: number;
};

export type NetworkSummary = {
  paymentIndex: number;
  refinancingIndex: number;
  assetPrice: number;
  fractured: number;
  stress: number;
};

const EPSILON = 1e-7;
const STEP = 1 / 20;

const relationLabels: Record<RelationKind, string> = {
  wage: "wage payment",
  consumption: "consumer spending",
  "supplier-payment": "supplier settlement",
  tax: "tax payment",
  procurement: "public procurement",
  "debt-service": "debt service",
  refinancing: "refinancing credit",
  "bank-income": "bank income recycling",
  repo: "collateral funding rollover",
  "public-bill": "public bill rollover",
  "loan-stock": "corporate loan stock",
  "deposit-stock": "deposit liability",
  "central-bank-facility": "central bank collateral facility",
};

export function relationLabel(kind: RelationKind) {
  return relationLabels[kind];
}

export function actorLabel(actor: FinancialActor) {
  return actor.label;
}

const byId = (state: FinancialNetworkState, id: string) =>
  state.actors.find((actor) => actor.id === id);

const clamp = (value: number, lower: number, upper: number) =>
  Math.min(upper, Math.max(lower, value));

const periodicDemand = (state: FinancialNetworkState, relation: FinancialRelation) => {
  const slow = Math.sin(state.time * 0.57 + relation.phase);
  const fast = Math.sin(state.time * 1.61 + relation.phase * 1.73);
  // Normal life is deliberately not a static diagram: firms' receipts and
  // payrolls breathe at different phases, but their mean circuit still clears.
  return relation.baseline * Math.max(0.5, 1 + slow * 0.16 + fast * 0.065);
};

const availableCash = (state: FinancialNetworkState, actor: FinancialActor) => {
  if (actor.fractured) return 0;
  const activeShock = state.time < actor.shockedUntil ? actor.shockSeverity : 0;
  // A strained firm does not put every remaining deposit back into circulation.
  // This is a deliberately simple precautionary-hoarding rule: it makes a
  // funding shock visible first as a shrinking payment surface, then as arrears.
  const precautionaryReserve = actor.kind === "firm"
    ? Math.max(0, actor.stress - 0.24) * actor.liquidityNeed * 4.2
    : 0;
  return Math.max(0, actor.cash * (1 - activeShock) - precautionaryReserve);
};

function setActual(relation: FinancialRelation, paid: number, dt: number) {
  const measuredRate = paid / Math.max(dt, EPSILON);
  relation.actual += (measuredRate - relation.actual) * clamp(dt * 5.5, 0, 1);
}

function pay(
  state: FinancialNetworkState,
  relation: FinancialRelation,
  requested: number,
  dt: number,
) {
  const from = byId(state, relation.from);
  const to = byId(state, relation.to);
  if (!from || !to || requested <= EPSILON) return 0;

  const paid = Math.min(requested, availableCash(state, from));
  from.cash -= paid;
  to.cash += paid;
  relation.arrears += requested - paid;
  from.arrears += requested - paid;
  setActual(relation, paid, dt);
  return paid;
}

function settleDebt(
  state: FinancialNetworkState,
  payment: FinancialRelation,
  loan: FinancialRelation,
  requested: number,
  dt: number,
) {
  const borrower = byId(state, payment.from);
  if (!borrower || borrower.fractured) return 0;
  const paid = Math.min(requested, availableCash(state, borrower), loan.outstanding);
  borrower.cash -= paid;
  loan.outstanding -= paid;
  payment.arrears += requested - paid;
  loan.arrears += requested - paid;
  borrower.arrears += requested - paid;
  setActual(payment, paid, dt);
  return paid;
}

function createActor(
  id: string,
  label: string,
  kind: ActorKind,
  community: number,
  cash: number,
  collateral = 0,
): FinancialActor {
  return {
    id,
    label,
    kind,
    community,
    cash,
    collateral,
    liquidityNeed:
      kind === "bank" ? 118 : kind === "fund" ? 74 : kind === "firm" ? 16 : kind === "household" ? 8 : 0,
    arrears: 0,
    stress: 0.04,
    shockedUntil: 0,
    shockSeverity: 0,
    fractured: false,
  };
}

function createRelation(
  id: string,
  from: string,
  to: string,
  kind: RelationKind,
  layer: RelationLayer,
  baseline: number,
  phase: number,
  outstanding = 0,
): FinancialRelation {
  return {
    id,
    from,
    to,
    kind,
    layer,
    baseline,
    actual: layer === "payment" ? baseline : 0,
    outstanding,
    arrears: 0,
    phase,
  };
}

/**
 * A deliberately compact macro-financial circuit. There are few actors, but
 * no relation is elided: every payment, rollover, claim and facility is kept
 * as a separate directed ledger relation so the screen can be read as a map.
 */
export function createFinancialNetwork(): FinancialNetworkState {
  const actors: FinancialActor[] = [
    createActor("bank-1", "BANK 01", "bank", 0, 268),
    createActor("bank-2", "BANK 02", "bank", 1, 268),
    createActor("firm-1", "FIRM 01", "firm", 0, 34, 146),
    createActor("firm-2", "FIRM 02", "firm", 1, 34, 146),
    createActor("firm-3", "FIRM 03", "firm", 0, 46, 224),
    createActor("household-1", "HOUSEHOLD 01", "household", 0, 58),
    createActor("household-2", "HOUSEHOLD 02", "household", 1, 58),
    createActor("fund-1", "FUND 01", "fund", 0, 152, 98),
    createActor("fund-2", "FUND 02", "fund", 1, 152, 98),
    createActor("treasury", "TREASURY", "treasury", 0, 620),
    createActor("central-bank", "CENTRAL BANK", "central-bank", 0, 1_000),
  ];

  const relations: FinancialRelation[] = [];
  const add = (...args: Parameters<typeof createRelation>) => relations.push(createRelation(...args));

  const firms = [
    { id: "firm-1", bank: "bank-1", phase: 0.1, loan: 118 },
    { id: "firm-2", bank: "bank-2", phase: 0.72, loan: 118 },
    { id: "firm-3", bank: "bank-1", phase: 1.34, loan: 164 },
  ] as const;

  for (const firm of firms) {
    add(`loan:${firm.id}`, firm.id, firm.bank, "loan-stock", "claim", 0, firm.phase, firm.loan);
    add(`debt-service:${firm.id}`, firm.id, firm.bank, "debt-service", "payment", 1.45, firm.phase + 0.18);
    add(`refinancing:${firm.id}`, firm.bank, firm.id, "refinancing", "payment", 1.45, firm.phase + 0.48);
    add(`deposit:${firm.id}`, firm.bank, firm.id, "deposit-stock", "claim", 0, firm.phase + 0.7, 34);
    add(`firm-tax:${firm.id}`, firm.id, "treasury", "tax", "payment", 0.34, firm.phase + 1.08);
  }

  for (const household of [
    { id: "household-1", firm: "firm-1", bank: "bank-1", phase: 0.26 },
    { id: "household-2", firm: "firm-2", bank: "bank-2", phase: 0.92 },
  ] as const) {
    add(`wage:${household.firm}:${household.id}`, household.firm, household.id, "wage", "payment", 3.35, household.phase);
    add(`consumption:${household.id}`, household.id, household.firm, "consumption", "payment", 2.62, household.phase + 0.42);
    add(`household-tax:${household.id}`, household.id, "treasury", "tax", "payment", 0.26, household.phase + 0.86);
    add(`bank-income:${household.id}`, household.bank, household.id, "bank-income", "payment", 0.16, household.phase + 1.2);
    add(`deposit:${household.id}`, household.bank, household.id, "deposit-stock", "claim", 0, household.phase, 58);
  }

  add("supplier:firm-1:firm-3", "firm-1", "firm-3", "supplier-payment", "payment", 1.12, 1.75);
  add("supplier:firm-2:firm-3", "firm-2", "firm-3", "supplier-payment", "payment", 1.12, 2.12);
  add("procurement:firm-3", "treasury", "firm-3", "procurement", "payment", 1.82, 0.56);

  for (const funding of [
    { fund: "fund-1", bank: "bank-1", phase: 0.35 },
    { fund: "fund-2", bank: "bank-2", phase: 1.12 },
  ] as const) {
    add(`repo-payment:${funding.fund}`, funding.fund, funding.bank, "repo", "payment", 0.9, funding.phase);
    add(`repo-roll:${funding.fund}`, funding.bank, funding.fund, "repo", "payment", 0.9, funding.phase + 0.34);
    add(`bill-purchase:${funding.fund}`, funding.fund, "treasury", "public-bill", "payment", 0.74, funding.phase + 0.68);
    add(`bill-redemption:${funding.fund}`, "treasury", funding.fund, "public-bill", "payment", 0.74, funding.phase + 1.02);
    add(`deposit:${funding.fund}`, funding.bank, funding.fund, "deposit-stock", "claim", 0, funding.phase, 152);
    add(`facility:${funding.bank}`, "central-bank", funding.bank, "central-bank-facility", "facility", 0, funding.phase, 86);
  }

  return {
    time: 0,
    actors,
    relations,
    assetPrice: 1,
    paymentIndex: 1,
    refinancingIndex: 1,
    systemStress: 0.04,
  };
}

function relationFor(state: FinancialNetworkState, id: string) {
  const relation = state.relations.find((item) => item.id === id);
  if (!relation) throw new Error(`Missing financial relation ${id}`);
  return relation;
}

function loanFor(state: FinancialNetworkState, firmId: string) {
  return relationFor(state, `loan:${firmId}`);
}

function activeShock(actor: FinancialActor, state: FinancialNetworkState) {
  return state.time < actor.shockedUntil ? actor.shockSeverity : 0;
}

function settleScheduledPayments(state: FinancialNetworkState, dt: number) {
  const payments = state.relations.filter((relation) => relation.layer === "payment");
  const regular = payments.filter(
    (relation) => relation.kind !== "debt-service" && relation.kind !== "refinancing",
  );
  for (const relation of regular) {
    const requested = periodicDemand(state, relation) * dt;
    pay(state, relation, requested, dt);
  }

  for (const payment of payments.filter((relation) => relation.kind === "debt-service")) {
    const loan = loanFor(state, payment.from);
    const requested = periodicDemand(state, payment) * dt;
    settleDebt(state, payment, loan, requested, dt);
  }
}

function refinanceLoans(state: FinancialNetworkState, dt: number) {
  const rollovers = state.relations.filter((relation) => relation.kind === "refinancing");
  let requestedTotal = 0;
  let grantedTotal = 0;
  for (const rollover of rollovers) {
    const bank = byId(state, rollover.from);
    const firm = byId(state, rollover.to);
    const loan = loanFor(state, rollover.to);
    if (!bank || !firm || bank.fractured || firm.fractured) continue;
    const requested = periodicDemand(state, rollover) * dt;
    requestedTotal += requested;
    const marketPressure = clamp((1 - state.assetPrice) * 0.7 + bank.stress * 0.9, 0, 0.95);
    const shockPenalty = activeShock(bank, state) * 0.8;
    const collateralCapacity = Math.max(0, firm.collateral * state.assetPrice * 0.82 - loan.outstanding);
    const bankCapacity = Math.max(0, availableCash(state, bank) - bank.liquidityNeed * 0.62);
    const permitted = Math.max(
      0,
      Math.min(
        requested,
        requested * (1 - marketPressure - shockPenalty),
        collateralCapacity + requested * 0.3,
        bankCapacity * 0.04 + requested * 0.35,
      ),
    );
    firm.cash += permitted;
    loan.outstanding += permitted;
    rollover.arrears += requested - permitted;
    loan.arrears += requested - permitted;
    firm.arrears += requested - permitted;
    setActual(rollover, permitted, dt);
    requestedTotal += 0;
    grantedTotal += permitted;
  }
  state.refinancingIndex = requestedTotal > EPSILON ? grantedTotal / requestedTotal : 1;
}

function updateClaimStocks(state: FinancialNetworkState) {
  for (const claim of state.relations.filter((relation) => relation.kind === "deposit-stock")) {
    claim.outstanding = byId(state, claim.to)?.cash ?? 0;
  }
  for (const facility of state.relations.filter(
    (relation) => relation.kind === "central-bank-facility",
  )) {
    const bank = byId(state, facility.to);
    const loanBook = state.relations
      .filter((relation) => relation.kind === "loan-stock" && relation.to === facility.to)
      .reduce((total, relation) => total + relation.outstanding, 0);
    facility.outstanding = Math.max(0, Math.min(loanBook * 0.62, bank?.cash ?? 0, 185));
  }
}

function updateStressAndCollateral(state: FinancialNetworkState, dt: number) {
  let forcedSales = 0;
  for (const actor of state.actors) {
    const shock = activeShock(actor, state);
    const liquidityGap = Math.max(0, actor.liquidityNeed - availableCash(state, actor));
    const arrearsPressure = actor.arrears / Math.max(actor.liquidityNeed * 5, 1);
    const next = clamp(
      shock * 0.92 + liquidityGap / Math.max(actor.liquidityNeed * 2.5, 1) + arrearsPressure,
      0,
      1,
    );
    actor.stress += (next - actor.stress) * clamp(dt * 1.2, 0, 1);
    actor.arrears *= Math.exp(-dt * 0.08);
    if ((actor.kind === "firm" || actor.kind === "fund") && actor.stress > 0.46) {
      forcedSales += actor.collateral * (actor.stress - 0.46) * dt * 0.038;
    }
    if (
      !actor.fractured &&
      actor.stress > 0.93 &&
      (actor.kind === "firm" || actor.kind === "bank" || actor.kind === "fund")
    ) {
      actor.fractured = true;
    }
  }
  const priceImpulse = forcedSales / 420;
  state.assetPrice = clamp(
    state.assetPrice * Math.exp(-priceImpulse) + (1 - state.assetPrice) * dt * 0.025,
    0.36,
    1.06,
  );
  const financialActors = state.actors.filter(
    (actor) => actor.kind === "bank" || actor.kind === "firm" || actor.kind === "fund",
  );
  state.systemStress = financialActors.reduce((total, actor) => total + actor.stress, 0) /
    Math.max(financialActors.length, 1);
}

function updatePaymentIndex(state: FinancialNetworkState) {
  const paymentRelations = state.relations.filter(
    (relation) => relation.layer === "payment" && relation.kind !== "refinancing",
  );
  const actual = paymentRelations.reduce((total, relation) => total + relation.actual, 0);
  const baseline = paymentRelations.reduce((total, relation) => total + relation.baseline, 0);
  state.paymentIndex = baseline > EPSILON ? actual / baseline : 1;
}

/** Advances in fixed quanta so the visual 20 Hz caller and tests agree. */
export function stepFinancialNetwork(state: FinancialNetworkState, seconds: number) {
  let remaining = clamp(seconds, 0, 20);
  while (remaining > EPSILON) {
    const dt = Math.min(STEP, remaining);
    for (const relation of state.relations) relation.actual *= Math.exp(-dt * 0.28);
    settleScheduledPayments(state, dt);
    refinanceLoans(state, dt);
    updateStressAndCollateral(state, dt);
    updateClaimStocks(state);
    updatePaymentIndex(state);
    state.time += dt;
    remaining -= dt;
  }
}

export function applyLiquidityShock(
  state: FinancialNetworkState,
  actorId: string,
  severity: number,
  persistence: ShockPersistence,
) {
  const actor = byId(state, actorId);
  if (!actor || actor.kind === "treasury" || actor.kind === "central-bank") return;
  const boundedSeverity = clamp(severity, 0.08, 0.9);
  actor.shockSeverity = boundedSeverity;
  actor.shockedUntil =
    persistence === "brief" ? state.time + 4.5 : Number.POSITIVE_INFINITY;
}

export function clearLiquidityShock(state: FinancialNetworkState, actorId: string) {
  const actor = byId(state, actorId);
  if (!actor) return;
  actor.shockSeverity = 0;
  actor.shockedUntil = state.time;
}

export function isShocked(state: FinancialNetworkState, actor: FinancialActor) {
  return state.time < actor.shockedUntil && actor.shockSeverity > 0;
}

export function summarizeNetwork(state: FinancialNetworkState): NetworkSummary {
  return {
    paymentIndex: state.paymentIndex,
    refinancingIndex: state.refinancingIndex,
    assetPrice: state.assetPrice,
    fractured: state.actors.filter((actor) => actor.fractured).length,
    stress: state.systemStress,
  };
}
