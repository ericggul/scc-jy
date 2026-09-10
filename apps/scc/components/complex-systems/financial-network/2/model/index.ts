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
  | "interbank-funding"
  | "repo"
  | "public-bill"
  | "loan-stock"
  | "deposit-stock"
  | "interbank-credit"
  | "central-bank-facility";

export type RelationLayer = "payment" | "claim" | "facility";
export type ShockPersistence = "brief" | "persistent";
export type NetworkPreset = "compact" | "expanded";

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
  preset: NetworkPreset;
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

// The simulation is dimensionless internally. One displayed unit represents
// ten million nominal currency units, keeping the representative balance
// sheets and their live payment flows legible on the same field.
export const NOMINAL_UNIT_MILLIONS = 10;

const relationLabels: Record<RelationKind, string> = {
  wage: "wage payment",
  consumption: "consumer spending",
  "supplier-payment": "supplier settlement",
  tax: "tax payment",
  procurement: "public procurement",
  "debt-service": "debt service",
  refinancing: "refinancing credit",
  "bank-income": "bank income recycling",
  "interbank-funding": "interbank funding settlement",
  repo: "collateral funding rollover",
  "public-bill": "public bill rollover",
  "loan-stock": "corporate loan stock",
  "deposit-stock": "deposit liability",
  "interbank-credit": "interbank credit claim",
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
  // Precautionary hoarding is a transmission mechanism, not a visual effect:
  // a missed receipt makes an actor preserve cash, which constrains the next
  // counterparty's settlement and can turn a local stop into a network wave.
  const reserveMultiplier = actor.kind === "firm" ? 4.4
    : actor.kind === "household" ? 2.5
      : actor.kind === "bank" ? 3.2
        : actor.kind === "fund" ? 3.6
          : 0;
  const precautionaryReserve = Math.max(0, actor.stress - 0.2) * actor.liquidityNeed * reserveMultiplier;
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
  liquidityScale = 1,
): FinancialActor {
  const liquidityNeed = kind === "bank" ? 118
    : kind === "fund" ? 74
      : kind === "firm" ? 16
        : kind === "household" ? 8
          : 0;
  return {
    id,
    label,
    kind,
    community,
    cash,
    collateral,
    liquidityNeed: liquidityNeed * liquidityScale,
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
 * A bounded stock-flow circuit. Actors are sector representatives—not a claim
 * that the visible firms or households are a literal economy—and every
 * settlement, claim, rollover and facility remains explicit. The expanded
 * preset repeats the same household/firm relation grammar over a larger fixed
 * field; it does not introduce a second economic model.
 */
export function createFinancialNetwork(preset: NetworkPreset = "compact"): FinancialNetworkState {
  const expanded = preset === "expanded";
  const bankCount = expanded ? 6 : 4;
  const sectorCount = expanded ? 20 : 8;
  const householdsPerFirm = expanded ? 2 : 1;
  const householdCount = sectorCount * householdsPerFirm;
  // Funds, the public balance sheets, procurement paths, and interbank links
  // stay exactly as the compact /2 model defines them. The only expanded
  // population is the requested 6 banks / 20 firms / 40 households.
  const fundCount = 4;
  const actors: FinancialActor[] = [];
  for (let index = 0; index < bankCount; index += 1) {
    actors.push(createActor(`bank-${index + 1}`, `BANK ${String(index + 1).padStart(2, "0")}`, "bank", index, 510));
  }
  for (let index = 0; index < sectorCount; index += 1) {
    actors.push(createActor(`firm-${index + 1}`, `FIRM ${String(index + 1).padStart(2, "0")}`, "firm", index % bankCount, 42, 174));
  }
  for (let index = 0; index < householdCount; index += 1) {
    // The 40-household view resolves each compact household sector into two
    // representatives. Their stock and liquidity buffer are halves, preserving
    // the aggregate household balance sheet rather than doubling the economy.
    const householdScale = 1 / householdsPerFirm;
    actors.push(createActor(
      `household-${index + 1}`,
      `HOUSEHOLD ${String(index + 1).padStart(2, "0")}`,
      "household",
      (index % sectorCount) % bankCount,
      76 * householdScale,
      0,
      householdScale,
    ));
  }
  for (let index = 0; index < fundCount; index += 1) {
    actors.push(createActor(`fund-${index + 1}`, `FUND ${String(index + 1).padStart(2, "0")}`, "fund", index, 238, 116));
  }
  actors.push(createActor("treasury", "TREASURY", "treasury", 0, 1_180));
  actors.push(createActor("central-bank", "CENTRAL BANK", "central-bank", 0, 1_650));

  const relations: FinancialRelation[] = [];
  const add = (...args: Parameters<typeof createRelation>) => relations.push(createRelation(...args));

  for (let index = 0; index < sectorCount; index += 1) {
    const firm = `firm-${index + 1}`;
    const bank = `bank-${(index % bankCount) + 1}`;
    const supplier = `firm-${((index + 2) % sectorCount) + 1}`;
    const phase = index * 0.59;
    const householdShare = 1 / householdsPerFirm;
    add(`loan:${firm}`, firm, bank, "loan-stock", "claim", 0, phase, 128);
    add(`debt-service:${firm}`, firm, bank, "debt-service", "payment", 1.34, phase + 0.15);
    add(`refinancing:${firm}`, bank, firm, "refinancing", "payment", 1.34, phase + 0.48);
    add(`deposit:${firm}`, bank, firm, "deposit-stock", "claim", 0, phase + 0.65, 42);
    add(`firm-tax:${firm}`, firm, "treasury", "tax", "payment", 0.32, phase + 0.92);
    for (let householdSlot = 0; householdSlot < householdsPerFirm; householdSlot += 1) {
      const household = `household-${index + 1 + householdSlot * sectorCount}`;
      const householdPhase = phase + householdSlot * 0.19;
      add(`wage:${firm}:${household}`, firm, household, "wage", "payment", 3.28 * householdShare, householdPhase + 0.26);
      add(`consumption:${household}`, household, firm, "consumption", "payment", 2.54 * householdShare, householdPhase + 0.58);
      add(`household-tax:${household}`, household, "treasury", "tax", "payment", 0.23 * householdShare, householdPhase + 0.82);
      add(`bank-income:${household}`, bank, household, "bank-income", "payment", 0.14 * householdShare, householdPhase + 1.16);
      add(`deposit:${household}`, bank, household, "deposit-stock", "claim", 0, householdPhase + 0.12, 76 * householdShare);
    }
    add(`supplier:${firm}:${supplier}`, firm, supplier, "supplier-payment", "payment", 0.78, phase + 1.38);
  }

  const procurementFirms = [2, 5, 8];
  for (const [index, firmNumber] of procurementFirms.entries()) {
    add(
      `procurement:firm-${firmNumber}`,
      "treasury",
      `firm-${firmNumber}`,
      "procurement",
      "payment",
      index === procurementFirms.length - 1 ? 0.94 : 1.12,
      0.42 + index * 0.71,
    );
  }

  for (let index = 0; index < fundCount; index += 1) {
    const fund = `fund-${index + 1}`;
    const bank = `bank-${index + 1}`;
    const phase = 0.36 + index * 0.82;
    add(`repo-payment:${fund}`, fund, bank, "repo", "payment", 0.72, phase);
    add(`repo-roll:${fund}`, bank, fund, "repo", "payment", 0.72, phase + 0.32);
    add(`bill-purchase:${fund}`, fund, "treasury", "public-bill", "payment", 0.64, phase + 0.66);
    add(`bill-redemption:${fund}`, "treasury", fund, "public-bill", "payment", 0.64, phase + 1.04);
    add(`deposit:${fund}`, bank, fund, "deposit-stock", "claim", 0, phase, 238);
    add(`facility:${bank}`, "central-bank", bank, "central-bank-facility", "facility", 0, phase, 88);
  }

  // Short bank-to-bank funding creates a second transmission surface. These
  // are obligations, not a decorative mesh: if one bank hoards cash, the
  // receiving bank loses an actual settlement while its credit claim remains.
  const interbankPairs = [
    ["bank-1", "bank-2", 0.24],
    ["bank-2", "bank-3", 1.08],
    ["bank-3", "bank-4", 1.92],
  ] as const;
  for (const [from, to, phase] of interbankPairs) {
    add(`interbank-credit:${from}:${to}`, from, to, "interbank-credit", "claim", 0, phase, 56);
    add(`interbank-funding:${from}:${to}`, from, to, "interbank-funding", "payment", 0.62, phase + 0.28);
  }

  return {
    preset,
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
  const incomingPressure = new Map<string, { weighted: number; weight: number }>();
  const addIncomingPressure = (actorId: string, pressure: number, weight: number) => {
    const current = incomingPressure.get(actorId) ?? { weighted: 0, weight: 0 };
    current.weighted += pressure * weight;
    current.weight += weight;
    incomingPressure.set(actorId, current);
  };

  for (const relation of state.relations.filter((candidate) => candidate.layer === "payment")) {
    const payer = byId(state, relation.from);
    if (!payer) continue;
    const accumulatedShortfall = relation.arrears / Math.max(relation.baseline * 6, 1);
    const pressure = clamp(
      Math.max(accumulatedShortfall, payer.stress * 0.78, activeShock(payer, state) * 0.85),
      0,
      1,
    );
    addIncomingPressure(relation.to, pressure, Math.max(relation.baseline, 0.1));
  }

  let forcedSales = 0;
  for (const actor of state.actors) {
    const shock = activeShock(actor, state);
    const liquidityGap = Math.max(0, actor.liquidityNeed - availableCash(state, actor));
    const arrearsPressure = actor.arrears / Math.max(actor.liquidityNeed * 5, 1);
    const incoming = incomingPressure.get(actor.id);
    const counterpartyPressure = incoming ? incoming.weighted / Math.max(incoming.weight, EPSILON) : 0;
    const creditPressure = actor.kind === "bank"
      ? state.relations
        .filter((relation) => relation.kind === "loan-stock" && relation.to === actor.id)
        .reduce((pressure, relation) => pressure + relation.arrears / Math.max(relation.outstanding, 1), 0) /
        Math.max(state.relations.filter((relation) => relation.kind === "loan-stock" && relation.to === actor.id).length, 1)
      : 0;
    const collateralPressure = (actor.kind === "firm" || actor.kind === "fund")
      ? Math.max(0, 1 - state.assetPrice) * 0.58
      : 0;
    const next = clamp(
      shock * 0.96 +
        liquidityGap / Math.max(actor.liquidityNeed * 2.5, 1) +
        arrearsPressure * 0.62 +
        counterpartyPressure * 0.86 +
        creditPressure * 1.15 +
        collateralPressure,
      0,
      1,
    );
    actor.stress += (next - actor.stress) * clamp(dt * 1.7, 0, 1);
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
  // A brief shock is a tested liquidity interruption, not a covert permanent
  // default. Persistent shocks retain the selected severity and can activate
  // the reinforcing channels below.
  actor.shockSeverity = persistence === "brief" ? boundedSeverity * 0.52 : boundedSeverity;
  actor.shockedUntil =
    persistence === "brief" ? state.time + 2.25 : Number.POSITIVE_INFINITY;
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
