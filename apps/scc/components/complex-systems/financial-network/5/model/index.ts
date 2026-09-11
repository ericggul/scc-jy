/**
 * A deliberately small stock-flow model. Cash is a deposit/reserve balance:
 * ordinary payments move deposits between holders, lending creates a matching
 * loan and deposit, and loan principal repayment extinguishes both. Bank
 * reserves settle cross-bank payments. Collateral sales exchange an existing
 * asset for an existing buyer's cash; they never create sale proceeds.
 *
 * This is an educational abstraction, not a solvency or market-price model.
 * In particular it has no maturity ladder, bankruptcy court, central-bank
 * policy reaction, or heterogeneous deposit insurance.
 */

export type Sector = "household" | "firm" | "bank" | "fund" | "treasury" | "centralBank";
export type EdgeKind = "wage" | "consumption" | "loan" | "tax" | "procurement" | "dividend" | "bond" | "backstop" | "backstopDisbursement";
export type PopulationPreset = "compact" | "expanded";

export interface EconomyNode {
  id: string;
  label: string;
  sector: Sector;
  community: number;
  cash: number;
  /** Immediately spendable cash; frozen balances keep the remainder locked. */
  liquidCash: number;
  equity: number;
  reserveTarget: number;
  frozen: boolean;
  defaulted: boolean;
  stress: number;
  /** Bank at which this non-bank holds its deposit. */
  bankId?: string;
  /** Productive/collateral units owned by firms and funds. */
  collateral: number;
  deposits: number;
  creditLimit: number;
  shortfall: number;
  /** Observed missed wage income; drives household precautionary saving. */
  incomeShortfall: number;
  /** Household response to lived income risk, from 0 (normal) to 0.62. */
  savingPropensity: number;
  /** Bank-only exponentially weighted memory of realised repayment losses. */
  lossMemory: number;
  /** Bank-only lending stance learned from realised repayment losses. */
  lendingStandard: number;
  /** Repayment loss observed since the last behavioural update. */
  observedLoss: number;
  /** Earliest model time at which this actor may switch its deposit bank again. */
  nextSwitchAt: number;
}

export interface EconomyEdge {
  id: string;
  /** All flows follow from → to, including loan debt service. */
  from: string;
  to: string;
  kind: EdgeKind;
  /** Outstanding debt for loan edges; a visual claim size otherwise. */
  principal: number;
  /** Smoothed actual payment rate per model second. */
  flow: number;
  arrears: number;
}

export interface Economy {
  nodes: EconomyNode[];
  edges: EconomyEdge[];
  time: number;
  price: number;
  /** Counterparties reassess at discrete, deterministic intervals. */
  nextNetworkReview: number;
  population: PopulationPreset;
}

const EPSILON = 1e-8;
// A fixed settlement quantum makes a UI calling at 24 Hz and a caller using
// one-second chunks follow the same payment order and liquidity lock.
const PERIOD = 1 / 24;
// The large field retains stable entity IDs. Caching lookup removes repeated
// linear scans from the 24 Hz settlement loop without moving state outside the
// model or weakening deterministic replay.
const nodesByState = new WeakMap<Economy, Map<string, EconomyNode>>();
const byId = (state: Economy, id: string) => {
  let nodes = nodesByState.get(state);
  if (!nodes) {
    nodes = new Map(state.nodes.map((node) => [node.id, node]));
    nodesByState.set(state, nodes);
  }
  return nodes.get(id);
};
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const availableCash = (node: EconomyNode) => node.frozen ? node.liquidCash : node.cash;

function bankFor(state: Economy, node: EconomyNode): EconomyNode | undefined {
  return node.sector === "bank" ? node : node.bankId ? byId(state, node.bankId) : undefined;
}

function smoothFlow(item: EconomyEdge | undefined, amount: number, dt: number) {
  if (!item || dt <= 0) return;
  const rate = amount / dt;
  const weight = 1 - Math.exp(-dt / 3);
  // stepEconomy applies the matching global exponential decay once; payments
  // only add this period's weighted contribution, so separate loan interest
  // and principal payments compose without erasing one another.
  item.flow += rate * weight;
}

/**
 * A deterministic, zero-mean operating rhythm. The periods divide the long
 * baseline verification horizon, so healthy variation does not become a cash
 * drift or a random shock. Different firms, households, and funds breathe on
 * different clocks instead of pulsing as one decorative global wave.
 */
function healthyDemand(time: number, key: string) {
  let hash = 2_166_136_261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  const periods = [20, 25, 40] as const;
  const period = periods[(hash >>> 0) % periods.length];
  const secondaryPeriod = (hash & 1) === 0 ? 10 : 20;
  const amplitude = 0.1 + ((hash >>> 8) % 5) * 0.01;
  return 1
    + amplitude * Math.sin(Math.PI * 2 * time / period)
    + 0.035 * Math.sin(Math.PI * 2 * time / secondaryPeriod);
}

/** Moves only money already held by the payer. */
function transfer(state: Economy, payer: EconomyNode, payee: EconomyNode, requested: number, item: EconomyEdge | undefined, dt: number) {
  if (requested <= EPSILON || payer.defaulted || payee.defaulted) return 0;
  const amount = Math.min(requested, availableCash(payer));
  if (amount <= EPSILON) return 0;
  const payerBank = bankFor(state, payer);
  const payeeBank = bankFor(state, payee);
  const reserveCapacity = payerBank && payerBank.id !== payeeBank?.id
    ? Math.max(0, availableCash(payerBank) - payerBank.reserveTarget * 0.35)
    : Number.POSITIVE_INFINITY;
  const settled = Math.min(amount, reserveCapacity);
  if (settled <= EPSILON) return 0;
  if (payer.sector !== "bank") {
    payer.cash -= settled;
    if (payer.frozen) payer.liquidCash -= settled;
  }
  if (payee.sector !== "bank") {
    payee.cash += settled;
    if (payee.frozen) payee.liquidCash += settled * 0.15;
    else payee.liquidCash = payee.cash;
  }
  if (payerBank && payeeBank && payerBank.id !== payeeBank.id) {
    payerBank.cash -= settled;
    payerBank.liquidCash = payerBank.frozen ? Math.max(0, payerBank.liquidCash - settled) : payerBank.cash;
    payeeBank.cash += settled;
    payeeBank.liquidCash = payeeBank.frozen ? payeeBank.liquidCash + settled * 0.15 : payeeBank.cash;
  } else if (payerBank && !payeeBank) {
    payerBank.cash -= settled;
    payerBank.liquidCash = payerBank.frozen ? Math.max(0, payerBank.liquidCash - settled) : payerBank.cash;
  } else if (!payerBank && payeeBank) {
    payeeBank.cash += settled;
    payeeBank.liquidCash = payeeBank.frozen ? payeeBank.liquidCash + settled * 0.15 : payeeBank.cash;
  }
  smoothFlow(item, settled, dt);
  return settled;
}

function debitForLoanPayment(borrower: EconomyNode, requested: number, item: EconomyEdge) {
  const amount = Math.min(requested, availableCash(borrower), item.principal);
  if (amount <= EPSILON) return 0;
  borrower.cash -= amount;
  if (borrower.frozen) borrower.liquidCash -= amount;
  item.principal -= amount;
  return amount;
}

function payInterest(borrower: EconomyNode, requested: number) {
  const amount = Math.min(requested, availableCash(borrower));
  borrower.cash -= amount;
  if (borrower.frozen) borrower.liquidCash -= amount;
  // Income reduces a deposit liability and therefore raises bank equity.
  return amount;
}

function refreshBalanceSheets(state: Economy) {
  const loansByBank = new Map<string, number>();
  const debtsByBorrower = new Map<string, number>();
  const publicDebtByBank = new Map<string, number>();
  let publicClaims = 0;
  for (const edge of state.edges) {
    if (edge.kind === "loan") {
      loansByBank.set(edge.to, (loansByBank.get(edge.to) ?? 0) + edge.principal);
      debtsByBorrower.set(edge.from, (debtsByBorrower.get(edge.from) ?? 0) + edge.principal);
    }
    if (edge.kind === "backstop") {
      publicDebtByBank.set(edge.from, (publicDebtByBank.get(edge.from) ?? 0) + edge.principal);
      publicClaims += edge.principal;
    }
  }
  for (const bank of state.nodes.filter((node) => node.sector === "bank")) bank.deposits = 0;
  for (const node of state.nodes.filter((item) => item.sector !== "bank")) {
    const bank = bankFor(state, node);
    if (bank) bank.deposits += node.cash;
  }
  for (const bank of state.nodes.filter((node) => node.sector === "bank")) {
    const loans = loansByBank.get(bank.id) ?? 0;
    const publicDebt = publicDebtByBank.get(bank.id) ?? 0;
    bank.equity = bank.cash + loans + bank.collateral * state.price - bank.deposits - publicDebt;
    bank.defaulted = bank.equity < -0.001;
  }
  for (const node of state.nodes.filter((item) => item.sector !== "bank")) {
    const debts = debtsByBorrower.get(node.id) ?? 0;
    node.equity = node.cash + node.collateral * state.price + (node.sector === "centralBank" ? publicClaims : 0) - debts;
  }
}

function issueCredit(state: Economy, borrower: EconomyNode, bank: EconomyNode, requested: number) {
  if (requested <= EPSILON || bank.defaulted) return 0;
  const learnedCapacity = bank.lendingStandard;
  const bankLiquidity = (Math.max(0, bank.cash - bank.reserveTarget) + Math.max(0, bank.equity) * 0.22) * learnedCapacity;
  const freezeCapacity = bank.frozen ? 0.15 : 1;
  const currentCredit = state.edges.filter((item) => item.kind === "loan" && item.to === bank.id).reduce((sum, item) => sum + item.principal, 0);
  const borrowerDebt = state.edges.filter((item) => item.kind === "loan" && item.from === borrower.id).reduce((sum, item) => sum + item.principal, 0);
  // Credit is capped by specific pledged collateral, so a frozen borrower
  // cannot accumulate an unlimited stock of inaccessible newly-created cash.
  const collateralCapacity = Math.max(0, borrower.collateral * state.price * 0.88 - borrowerDebt);
  const capacity = Math.max(0, Math.min(bank.creditLimit * learnedCapacity - currentCredit, bankLiquidity * freezeCapacity, requested * freezeCapacity, collateralCapacity));
  const amount = Math.min(requested, capacity);
  if (amount <= EPSILON) return 0;
  let claim = state.edges.find((item) => item.kind === "loan" && item.from === borrower.id && item.to === bank.id);
  if (!claim) {
    claim = { id: `loan:${borrower.id}:${bank.id}`, from: borrower.id, to: bank.id, kind: "loan", principal: 0, flow: 0, arrears: 0 };
    state.edges.push(claim);
  }
  claim.principal += amount;
  borrower.cash += amount;
  if (borrower.frozen) borrower.liquidCash += amount * 0.15;
  else borrower.liquidCash = borrower.cash;
  return amount;
}

function serviceLoan(state: Economy, item: EconomyEdge, dt: number, interestIncome: Map<string, number>) {
  const borrower = byId(state, item.from);
  const bank = byId(state, item.to);
  if (!borrower || !bank || borrower.defaulted) return;
  const dueInterest = item.principal * 0.003 * dt;
  const paidInterest = payInterest(borrower, dueInterest);
  interestIncome.set(bank.id, (interestIncome.get(bank.id) ?? 0) + paidInterest);
  const missed = dueInterest - paidInterest;
  item.arrears += missed;
  // A fixed share of each loan matures every period. Repayment extinguishes
  // its matching deposit and claim; the replacement draw is new bank credit.
  // A frozen/weak lender can only roll part of it, producing refinancing gaps.
  const marginCall = Math.max(0, item.principal - borrower.collateral * state.price * 0.88);
  const duePrincipal = Math.min(item.principal, (item.principal * 0.06 + marginCall * 0.7) * dt);
  const paidPrincipal = debitForLoanPayment(borrower, duePrincipal, item);
  issueCredit(state, borrower, bank, paidPrincipal);
  item.arrears += duePrincipal - paidPrincipal;
  bank.observedLoss += missed + duePrincipal - paidPrincipal;
  smoothFlow(item, paidInterest + paidPrincipal, dt);
  if (item.principal > EPSILON && item.arrears > item.principal * 0.09) borrower.stress += 0.075 * dt;
}

function sellCollateral(state: Economy, bank: EconomyNode, dt: number) {
  const distressed = state.edges.filter((item) => item.kind === "loan" && item.to === bank.id && item.arrears > item.principal * 0.055);
  for (const claim of distressed) {
    const borrower = byId(state, claim.from);
    if (!borrower || borrower.collateral <= EPSILON) continue;
    const seizure = Math.min(borrower.collateral * 0.24 * dt, claim.arrears / Math.max(state.price, 0.1), claim.principal / Math.max(state.price, 0.1));
    borrower.collateral -= seizure;
    bank.collateral += seizure;
    const recovery = seizure * state.price;
    claim.principal = Math.max(0, claim.principal - recovery);
    claim.arrears = Math.max(0, claim.arrears - recovery * 0.45);
    const buyers = state.nodes.filter((node) => node.sector === "fund" && !node.defaulted);
    const buyerLiquidity = buyers.reduce((sum, node) => sum + availableCash(node), 0);
    const offered = Math.min(bank.collateral, seizure);
    const impact = offered / Math.max(20, buyerLiquidity);
    state.price = clamp(state.price * Math.exp(-0.55 * impact), 0.12, 1.08);
    let remaining = offered;
    for (const fund of buyers) {
      const desired = Math.min(remaining, availableCash(fund) / Math.max(state.price, 0.1) * 0.22);
      const paid = transfer(state, fund, bank, desired * state.price, undefined, dt);
      const units = paid / Math.max(state.price, 0.1);
      fund.collateral += units;
      bank.collateral -= units;
      remaining -= units;
    }
    // Unsold collateral remains an asset of the bank, marked at the new price.
  }
}

function updateStress(state: Economy, dt: number) {
  const arrearsByBorrower = new Map<string, number>();
  const debtByBorrower = new Map<string, number>();
  for (const edge of state.edges) {
    if (edge.kind !== "loan") continue;
    arrearsByBorrower.set(edge.from, (arrearsByBorrower.get(edge.from) ?? 0) + edge.arrears);
    debtByBorrower.set(edge.from, (debtByBorrower.get(edge.from) ?? 0) + edge.principal);
  }
  for (const node of state.nodes) {
    const shortage = node.shortfall / Math.max(EPSILON, dt) / Math.max(1, node.reserveTarget);
    const liquidity = availableCash(node) / Math.max(1, node.reserveTarget);
    const pressure = (node.frozen ? 0.14 : 0) + shortage * 0.3 + Math.max(0, 0.35 - liquidity) * 0.12;
    node.stress = clamp(node.stress + (pressure - node.stress) * clamp(dt * 0.35, 0, 1), 0, 1);
    node.shortfall = 0;
    const arrears = arrearsByBorrower.get(node.id) ?? 0;
    const debt = debtByBorrower.get(node.id) ?? 0;
    if (!node.defaulted && node.sector === "firm" && arrears > debt * 0.3 && availableCash(node) < node.reserveTarget * 0.12) {
      node.defaulted = true;
      // Default recognises the unsecured portion immediately. The remaining
      // claim is then worked out through the bank's collateral sale routine.
      for (const claim of state.edges.filter((item) => item.kind === "loan" && item.from === node.id)) {
        claim.principal *= 0.52;
        claim.arrears = Math.min(claim.arrears, claim.principal);
      }
    }
  }
}

/**
 * Learning changes future requests and constraints only. It never changes a
 * cash balance, a loan principal, or a balance-sheet identity by decree.
 */
function updateAdaptiveRules(state: Economy, dt: number) {
  for (const bank of state.nodes.filter((node) => node.sector === "bank")) {
    const loanBook = state.edges
      .filter((edge) => edge.kind === "loan" && edge.to === bank.id)
      .reduce((sum, edge) => sum + edge.principal, 0);
    // Interest plus scheduled principal is the period's observed repayment
    // opportunity. Loss memory decays slowly in the absence of new misses.
    const scheduledService = Math.max(EPSILON, loanBook * 0.063 * dt);
    const realisedLoss = clamp(bank.observedLoss / scheduledService, 0, 1);
    bank.lossMemory = clamp(bank.lossMemory + (realisedLoss - bank.lossMemory) * clamp(dt * 0.72, 0, 1), 0, 1);
    bank.lendingStandard = clamp(1 - bank.lossMemory * 0.66, 0.42, 1);
    bank.observedLoss = 0;
  }

  for (const household of state.nodes.filter((node) => node.sector === "household")) {
    const incomeSignal = household.incomeShortfall / Math.max(EPSILON, household.reserveTarget * dt);
    const stressSignal = Math.max(0, household.stress - 0.05);
    const targetSaving = clamp(incomeSignal * 0.58 + stressSignal * 0.75, 0, 0.62);
    household.savingPropensity = clamp(
      household.savingPropensity + (targetSaving - household.savingPropensity) * clamp(dt * 0.82, 0, 1),
      0,
      0.62,
    );
    household.incomeShortfall = 0;
  }
}

function bankSuitability(bank: EconomyNode) {
  if (bank.defaulted) return Number.NEGATIVE_INFINITY;
  const reserveBuffer = Math.max(0, availableCash(bank) - bank.reserveTarget * 0.35) / Math.max(1, bank.reserveTarget);
  return bank.lendingStandard * 1.45
    + Math.min(1.2, reserveBuffer) * 0.38
    - bank.lossMemory * 0.95
    - bank.stress * 0.6
    - (bank.frozen ? 1.1 : 0);
}

function preferredBank(state: Economy, currentBankId: string | undefined) {
  return state.nodes
    .filter((node) => node.sector === "bank" && node.id !== currentBankId && !node.frozen && !node.defaulted)
    .sort((left, right) => bankSuitability(right) - bankSuitability(left) || left.id.localeCompare(right.id))[0];
}

/** Moves the matching reserve asset when a firm moves its deposit relationship. */
function switchDepositBank(state: Economy, firm: EconomyNode, nextBank: EconomyNode) {
  const currentBank = firm.bankId ? byId(state, firm.bankId) : undefined;
  if (!currentBank || currentBank.sector !== "bank" || nextBank.id === currentBank.id) return false;
  const deposit = firm.cash;
  const transferable = Math.max(0, availableCash(currentBank) - currentBank.reserveTarget * 0.35);
  // The single bankId denotes the whole deposit relationship; do not invent a
  // partially migrated deposit when the old bank cannot settle it in full.
  if (transferable + EPSILON < deposit) return false;
  currentBank.cash -= deposit;
  currentBank.liquidCash = currentBank.frozen ? Math.max(0, currentBank.liquidCash - deposit) : currentBank.cash;
  nextBank.cash += deposit;
  nextBank.liquidCash = nextBank.frozen ? Math.min(nextBank.cash * 0.15, nextBank.liquidCash + deposit * 0.15) : nextBank.cash;
  firm.bankId = nextBank.id;
  firm.nextSwitchAt = state.time + 18;
  return true;
}

function reliableFirmCandidates(state: Economy, excludedId: string, wageLoad: ReadonlyMap<string, number>) {
  return state.nodes
    .filter((node) => node.sector === "firm" && node.id !== excludedId && !node.defaulted && !node.frozen && node.stress < 0.42)
    .sort((left, right) => {
      const leftScore = availableCash(left) / Math.max(1, left.reserveTarget) - left.stress * 2 - (wageLoad.get(left.id) ?? 0) * 0.09;
      const rightScore = availableCash(right) / Math.max(1, right.reserveTarget) - right.stress * 2 - (wageLoad.get(right.id) ?? 0) * 0.09;
      return rightScore - leftScore || left.id.localeCompare(right.id);
    });
}

/** A deterministic periodic review: deposit and payment links can dissolve and reform. */
function rewireAdaptiveRelations(state: Economy) {
  for (const firm of state.nodes.filter((node) => node.sector === "firm" && !node.frozen && !node.defaulted && state.time + EPSILON >= node.nextSwitchAt)) {
    const currentBank = firm.bankId ? byId(state, firm.bankId) : undefined;
    if (!currentBank || currentBank.sector !== "bank") continue;
    const candidate = preferredBank(state, currentBank.id);
    if (!candidate) continue;
    const currentScore = bankSuitability(currentBank);
    if (currentBank.frozen || currentBank.defaulted || currentBank.lendingStandard < 0.8 || bankSuitability(candidate) > currentScore + 0.24) {
      switchDepositBank(state, firm, candidate);
    }
  }

  const wageLoad = new Map<string, number>();
  for (const edge of state.edges.filter((item) => item.kind === "wage")) wageLoad.set(edge.from, (wageLoad.get(edge.from) ?? 0) + 1);

  for (const consumption of state.edges.filter((edge) => edge.kind === "consumption")) {
    const supplier = byId(state, consumption.to);
    if (!supplier || (supplier.sector === "firm" && (supplier.defaulted || supplier.stress >= 0.5))) {
      const replacement = reliableFirmCandidates(state, consumption.to, wageLoad)[0];
      if (replacement) consumption.to = replacement.id;
    }
  }
  for (const wage of state.edges.filter((edge) => edge.kind === "wage")) {
    const employer = byId(state, wage.from);
    if (!employer || (employer.sector === "firm" && (employer.defaulted || employer.stress >= 0.5))) {
      const replacement = reliableFirmCandidates(state, wage.from, wageLoad)[0];
      if (replacement) {
        wageLoad.set(wage.from, Math.max(0, (wageLoad.get(wage.from) ?? 1) - 1));
        wage.from = replacement.id;
        wageLoad.set(replacement.id, (wageLoad.get(replacement.id) ?? 0) + 1);
      }
    }
  }
}

function providePublicBackstop(state: Economy, dt: number) {
  const centralBank = byId(state, "central-bank");
  if (!centralBank) return;
  for (const bank of state.nodes.filter((node) => node.sector === "bank" && !node.defaulted)) {
    const deficit = Math.max(0, bank.reserveTarget * 0.72 - bank.cash);
    const existing = state.edges.filter((item) => item.kind === "backstop" && item.from === bank.id).reduce((sum, item) => sum + item.principal, 0);
    const eligible = state.edges.filter((item) => item.kind === "loan" && item.to === bank.id).reduce((sum, item) => sum + item.principal * 0.8, 0);
    const amount = Math.min(availableCash(centralBank), deficit * dt, Math.max(0, eligible - existing), 5 * dt);
    if (amount <= EPSILON) continue;
    centralBank.cash -= amount;
    centralBank.liquidCash = centralBank.frozen ? Math.max(0, centralBank.liquidCash - amount) : centralBank.cash;
    bank.cash += amount;
    bank.liquidCash = bank.frozen ? Math.min(bank.cash * 0.15, bank.liquidCash + amount * 0.15) : bank.cash;
    let claim = state.edges.find((item) => item.kind === "backstop" && item.from === bank.id);
    if (!claim) {
      claim = { id: `backstop:${bank.id}`, from: bank.id, to: centralBank.id, kind: "backstop", principal: 0, flow: 0, arrears: 0 };
      state.edges.push(claim);
    }
    claim.principal += amount;
    let disbursement = state.edges.find((item) => item.kind === "backstopDisbursement" && item.to === bank.id);
    if (!disbursement) {
      disbursement = { id: `backstop-disbursement:${bank.id}`, from: centralBank.id, to: bank.id, kind: "backstopDisbursement", principal: 0, flow: 0, arrears: 0 };
      state.edges.push(disbursement);
    }
    disbursement.principal = claim.principal;
    smoothFlow(disbursement, amount, dt);
  }
}

/** Advances one deterministic model period per second. Large dt values are split for stable settlement ordering. */
export function stepEconomy(state: Economy, dtSeconds: number): void {
  let remaining = Math.max(0, Math.min(dtSeconds, 20));
  while (remaining > EPSILON) {
    const dt = Math.min(PERIOD, remaining);
    for (const item of state.edges) item.flow *= Math.exp(-dt / 3);
    const time = state.time + dt;
    // Firms first make payroll. This makes missed wages a visible upstream
    // consequence of a liquidity freeze rather than an exogenous toggle.
    for (const wage of state.edges.filter((item) => item.kind === "wage")) {
      const firm = byId(state, wage.from);
      const household = byId(state, wage.to);
      if (!firm || !household) continue;
      const due = wage.principal * healthyDemand(time, `firm:${firm.id}`) * dt;
      const paid = transfer(state, firm, household, due, wage, dt);
      firm.shortfall += due - paid;
      household.incomeShortfall += due - paid;
    }
    for (const procurement of state.edges.filter((item) => item.kind === "procurement")) {
      const treasury = byId(state, procurement.from);
      const firm = byId(state, procurement.to);
      if (treasury && firm) transfer(state, treasury, firm, procurement.principal * healthyDemand(time, `firm:${firm.id}`) * Math.min(1, firm.collateral / 130) * dt, procurement, dt);
    }
    for (const consumption of state.edges.filter((item) => item.kind === "consumption")) {
      const household = byId(state, consumption.from);
      const firm = byId(state, consumption.to);
      if (household && firm) transfer(state, household, firm, consumption.principal * (1 - household.savingPropensity) * healthyDemand(time, `household:${household.id}`) * Math.min(1, firm.collateral / 130) * dt, consumption, dt);
    }
    for (const tax of state.edges.filter((item) => item.kind === "tax")) {
      const payer = byId(state, tax.from);
      const treasury = byId(state, tax.to);
      if (payer && treasury) transfer(state, payer, treasury, tax.principal * healthyDemand(time, `${payer.sector}:${payer.id}`) * dt, tax, dt);
    }
    for (const bond of state.edges.filter((item) => item.kind === "bond")) {
      const payer = byId(state, bond.from);
      const payee = byId(state, bond.to);
      const fundKey = bond.id.split(":").pop() ?? bond.id;
      if (payer && payee) transfer(state, payer, payee, bond.principal * healthyDemand(time, `fund:${fundKey}`) * dt, bond, dt);
    }
    const interestIncome = new Map<string, number>();
    for (const claim of state.edges.filter((item) => item.kind === "loan")) serviceLoan(state, claim, dt, interestIncome);
    // Each bank distributes the interest it actually received. This makes the
    // normal wage/consumption/fiscal circuit balance without an outside-money
    // injection, while missed loan payments immediately cut household income.
    for (const dividend of state.edges.filter((item) => item.kind === "dividend")) {
      const bank = byId(state, dividend.from);
      const household = byId(state, dividend.to);
      const recipients = state.edges.filter((item) => item.kind === "dividend" && item.from === dividend.from).length;
      const amount = (interestIncome.get(dividend.from) ?? 0) / Math.max(1, recipients);
      if (bank && household) transfer(state, bank, household, amount, dividend, dt);
    }
    refreshBalanceSheets(state);
    providePublicBackstop(state, dt);
    refreshBalanceSheets(state);
    updateAdaptiveRules(state, dt);
    state.time += dt;
    if (state.time + EPSILON >= state.nextNetworkReview) {
      rewireAdaptiveRelations(state);
      state.nextNetworkReview += 1;
      refreshBalanceSheets(state);
    }
    for (const firm of state.nodes.filter((node) => node.sector === "firm" && !node.defaulted)) {
      const bank = firm.bankId ? byId(state, firm.bankId) : undefined;
      if (!bank) continue;
      const floor = firm.reserveTarget * (firm.frozen ? 1.05 : 0.62);
      if (availableCash(firm) < floor && firm.stress < 0.72) issueCredit(state, firm, bank, floor - availableCash(firm));
    }
    refreshBalanceSheets(state);
    for (const bank of state.nodes.filter((node) => node.sector === "bank")) sellCollateral(state, bank, dt);
    refreshBalanceSheets(state);
    updateStress(state, dt);
    remaining -= dt;
  }
}

export function setFrozen(state: Economy, id: string, frozen: boolean): void {
  const node = byId(state, id);
  if (!node || node.frozen === frozen) return;
  node.frozen = frozen;
  // Freeze is a balance lock, not a repeatedly recalculated spending cap.
  node.liquidCash = frozen ? node.cash * 0.15 : node.cash;
}

export function createEconomy(population: PopulationPreset = "compact"): Economy {
  const expanded = population === "expanded";
  const bankCount = expanded ? 6 : 4;
  const firmCount = expanded ? 20 : 10;
  const householdsPerFirm = expanded ? 10 : 2;
  // The compact model represents two household positions per firm. Resolving
  // that position into ten people keeps each firm's normal household ledger
  // intact: every individual has one fifth of the previous cash, wage and tax.
  const householdScale = expanded ? 2 / householdsPerFirm : 1;
  const nodes: EconomyNode[] = [];
  const add = (id: string, label: string, sector: Sector, community: number, cash: number, bankId?: string, reserveScale = 1) =>
    nodes.push({ id, label, sector, community, cash, liquidCash: cash, equity: 0, reserveTarget: (sector === "bank" ? 110 : sector === "firm" ? 22 : sector === "fund" ? 55 : 12) * reserveScale, frozen: false, defaulted: false, stress: 0.03, bankId, collateral: sector === "firm" ? 130 : sector === "fund" ? 25 : 0, deposits: 0, creditLimit: sector === "bank" ? 720 : 0, shortfall: 0, incomeShortfall: 0, savingPropensity: 0, lossMemory: 0, lendingStandard: 1, observedLoss: 0, nextSwitchAt: 0 });
  for (let index = 0; index < bankCount; index += 1) add(`bank-${index + 1}`, `Bank ${index + 1}`, "bank", index, 1320);
  for (let firm = 0; firm < firmCount; firm += 1) {
    const community = firm % bankCount;
    for (let worker = 0; worker < householdsPerFirm; worker += 1) {
      const householdId = firm * householdsPerFirm + worker + 1;
      add(`household-${householdId}`, `Household ${householdId}`, "household", community, 58 * householdScale, `bank-${community + 1}`, householdScale);
    }
  }
  for (let index = 0; index < firmCount; index += 1) add(`firm-${index + 1}`, `Firm ${index + 1}`, "firm", index % bankCount, 54, `bank-${(index % bankCount) + 1}`);
  for (let index = 0; index < 4; index += 1) add(`fund-${index + 1}`, `Fund ${index + 1}`, "fund", index, 470, `bank-${(index % bankCount) + 1}`);
  // Public-sector balances are outside the commercial-bank deposit ledger in
  // this compact model; they can pay into it but do not make Bank 1 a hidden
  // systemically dominant custodian.
  add("treasury", "Treasury", "treasury", 0, 2100);
  add("central-bank", "Central Bank", "centralBank", 0, 3800);

  const edges: EconomyEdge[] = [];
  const addEdge = (id: string, from: string, to: string, kind: EdgeKind, principal: number) => edges.push({ id, from, to, kind, principal, flow: 0, arrears: 0 });
  for (let firm = 0; firm < firmCount; firm += 1) {
    const firmId = `firm-${firm + 1}`;
    const bankId = `bank-${(firm % bankCount) + 1}`;
    addEdge(`loan:${firmId}:${bankId}`, firmId, bankId, "loan", 106);
    addEdge(`procurement:${firmId}`, "treasury", firmId, "procurement", 0.8);
    addEdge(`tax-firm:${firmId}`, firmId, "treasury", "tax", 0.2);
    for (let worker = 0; worker < householdsPerFirm; worker += 1) {
      const householdId = `household-${firm * householdsPerFirm + worker + 1}`;
      addEdge(`wage:${firmId}:${householdId}`, firmId, householdId, "wage", 3.0 * householdScale);
      if (expanded) {
        // Every household has two equal suppliers. One stopped household thus
        // removes 5% of either recipient firm's household demand, never an
        // entire firm's consumer base.
        const secondSupplier = `firm-${((firm + 1) % firmCount) + 1}`;
        const basketShare = 2.859 * householdScale / 2;
        addEdge(`consumption:${householdId}:${firmId}`, householdId, firmId, "consumption", basketShare);
        addEdge(`consumption:${householdId}:${secondSupplier}`, householdId, secondSupplier, "consumption", basketShare);
      } else {
        // The compact field remains byte-for-byte equivalent in its payment
        // proportions so existing /5 observations retain their baseline.
        addEdge(`consumption:${householdId}:${firmId}`, householdId, firmId, "consumption", 2.2872);
        addEdge(`consumption:${householdId}:other`, householdId, `firm-${((firm + 3) % firmCount) + 1}`, "consumption", 0.5718);
      }
      addEdge(`tax-household:${householdId}`, householdId, "treasury", "tax", 0.3 * householdScale);
    }
  }
  for (let household = 0; household < firmCount * householdsPerFirm; household += 1) {
    const community = Math.floor(household / householdsPerFirm) % bankCount;
    addEdge(`dividend:${household + 1}`, `bank-${community + 1}`, `household-${household + 1}`, "dividend", 0);
  }
  for (let fund = 0; fund < 4; fund += 1) {
    // Short public bills mature and are rolled in the same period: the fund
    // receives the old bill's redemption then purchases the replacement.
    addEdge(`bond-rollover:${fund + 1}`, `fund-${fund + 1}`, "treasury", "bond", 0.16);
    addEdge(`bond-redemption:${fund + 1}`, "treasury", `fund-${fund + 1}`, "bond", 0.16);
  }
  const state: Economy = { nodes, edges, time: 0, price: 1, nextNetworkReview: 1, population };
  refreshBalanceSheets(state);
  // Equal finite loss-absorbing capital, not oversized reserves that hide drift.
  for (const bank of nodes.filter((node) => node.sector === "bank")) {
    bank.cash += 90 - bank.equity;
    bank.liquidCash = bank.cash;
  }
  refreshBalanceSheets(state);
  return state;
}

/** Useful to tests and consumers that want a transparent accounting check. */
export function bankBalanceError(state: Economy, bankId: string): number {
  const bank = byId(state, bankId);
  if (!bank || bank.sector !== "bank") return Number.NaN;
  const loans = state.edges.filter((item) => item.kind === "loan" && item.to === bank.id).reduce((sum, item) => sum + item.principal, 0);
  const publicDebt = state.edges.filter((item) => item.kind === "backstop" && item.from === bank.id).reduce((sum, item) => sum + item.principal, 0);
  return bank.cash + loans + bank.collateral * state.price - bank.deposits - publicDebt - bank.equity;
}
