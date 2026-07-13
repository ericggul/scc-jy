export const firmIds = ["1", "2", "3", "4"];
export const variableIds = ["product", "price", "capacity", "capital"];
export const competitionEdgeIds = firmIds.flatMap((from) =>
  firmIds.filter((to) => to !== from).map((to) => `${from}-to-${to}`),
);
export const internalEdgeIds = [
  "capital-to-product",
  "product-to-capital",
  "product-to-price",
  "capital-to-capacity",
  "capacity-to-price",
  "capacity-to-capital",
  "price-to-capital",
];

const initialFirms = {
  "1": { product: 0.58, price: 1.02, capacity: 1.0, capital: 0.62 },
  "2": { product: 0.54, price: 0.94, capacity: 1.08, capital: 0.56 },
  "3": { product: 0.62, price: 1.1, capacity: 0.92, capital: 0.7 },
  "4": { product: 0.5, price: 0.88, capacity: 1.16, capital: 0.5 },
};
const initialPolicies = {
  "1": { product: 0.13, price: 1.02, capacity: 1.0, capital: 0.45 },
  "2": { product: 0.11, price: 0.94, capacity: 1.08, capital: 0.35 },
  "3": { product: 0.15, price: 1.1, capacity: 0.92, capital: 0.55 },
  "4": { product: 0.09, price: 0.88, capacity: 1.16, capital: 0.25 },
};
const policyBounds = {
  product: [0.02, 0.35],
  price: [0.55, 1.65],
  capacity: [0.3, 2.0],
  capital: [0, 2.0],
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
function record(keys, value) {
  return Object.fromEntries(keys.map((key) => [key, value]));
}
function cloneNested(source) {
  return Object.fromEntries(firmIds.map((id) => [id, { ...source[id] }]));
}
let runSequence = 0;
function createRunId(now) {
  runSequence += 1;
  return `${now.toString(36)}-${runSequence.toString(36)}`;
}
function createHistories(runId) {
  return Object.fromEntries(
    firmIds.map((firmId) => [
      firmId,
      Array.from({ length: 48 }, (_, index) => ({
        id: `${runId}-${firmId}-initial-${index}`,
        time: index - 47,
        value: 0.25,
      })),
    ]),
  );
}

export function createCompetitiveFirmsRuntime(now = Date.now(), runId = createRunId(now)) {
  return {
    runId,
    revision: 0,
    serverTime: now,
    marketShares: record(firmIds, 0.25),
    firms: cloneNested(initialFirms),
    managementPolicies: cloneNested(initialPolicies),
    debts: record(firmIds, 0.24),
    utilities: record(firmIds, 0),
    demand: record(firmIds, 1),
    availability: record(firmIds, 1),
    sales: record(firmIds, 0),
    competitionFlows: record(competitionEdgeIds, 0),
    internalFlows: Object.fromEntries(
      firmIds.map((firmId) => [firmId, record(internalEdgeIds, 0)]),
    ),
    marketShareHistory: createHistories(runId),
    lastIntervention: null,
  };
}

export function applyCompetitiveFirmsIntervention(runtime, intervention, now = Date.now()) {
  if (
    intervention?.kind !== "management" ||
    !firmIds.includes(intervention.firmId) ||
    !variableIds.includes(intervention.variableId) ||
    !Number.isFinite(intervention.amount)
  ) return false;
  const [min, max] = policyBounds[intervention.variableId];
  const current = runtime.managementPolicies[intervention.firmId][intervention.variableId];
  const amount = clamp(intervention.amount, -1, 1);
  runtime.managementPolicies[intervention.firmId][intervention.variableId] = clamp(
    current + amount,
    min,
    max,
  );
  runtime.lastIntervention = {
    kind: "management",
    firmId: intervention.firmId,
    variableId: intervention.variableId,
    amount,
    appliedAt: now,
  };
  return true;
}

function smoothMin(a, b) {
  return 0.5 * (a + b - Math.sqrt((a - b) ** 2 + 0.0025));
}

function computeMarket(runtime) {
  const demand = Object.fromEntries(
    firmIds.map((id) => [id, 4 * runtime.marketShares[id]]),
  );
  const availability = Object.fromEntries(
    firmIds.map((id) => {
      const fulfilled = Math.max(0, smoothMin(demand[id], Math.max(0, runtime.firms[id].capacity)));
      return [id, demand[id] > 0.001 ? fulfilled / demand[id] : 1];
    }),
  );
  const rawUtility = Object.fromEntries(
    firmIds.map((id) => {
      const firm = runtime.firms[id];
      const perceivedProduct = Math.tanh((firm.product - 0.55) / 0.55);
      const perceivedPrice = Math.log(Math.max(0.08, firm.price));
      return [id, 1.7 * perceivedProduct - 2.4 * perceivedPrice + 1.1 * availability[id]];
    }),
  );
  const meanUtility = firmIds.reduce((sum, id) => sum + rawUtility[id], 0) / firmIds.length;
  const utilities = Object.fromEntries(firmIds.map((id) => [id, rawUtility[id] - meanUtility]));
  const competitionFlows = record(competitionEdgeIds, 0);
  const derivatives = record(firmIds, 0);

  for (const from of firmIds) {
    const alternatives = firmIds.filter((to) => to !== from).map((to) => ({
      to,
      weight: Math.exp(clamp(2.1 * (utilities[to] - utilities[from]) - 1.25, -8, 8)),
    }));
    const denominator = 1 + alternatives.reduce((sum, item) => sum + item.weight, 0);
    for (const { to, weight } of alternatives) {
      const flow = 0.22 * runtime.marketShares[from] * weight / denominator;
      competitionFlows[`${from}-to-${to}`] = flow;
      derivatives[from] -= flow;
      derivatives[to] += flow;
    }
  }
  return { availability, competitionFlows, demand, derivatives, utilities };
}

function computeFirm(runtime, firmId, market) {
  const firm = runtime.firms[firmId];
  const policy = runtime.managementPolicies[firmId];
  const debt = runtime.debts[firmId];
  const demand = market.demand[firmId];
  const fulfilled = Math.max(0, smoothMin(demand, Math.max(0, firm.capacity)));
  const researchSpend = policy.product * Math.max(firm.capital, 0.05);
  const productiveResearch = researchSpend / (1 + researchSpend);
  const desiredCapacityChange = policy.capacity - firm.capacity;
  const expansion = Math.max(0, desiredCapacityChange);
  const contraction = Math.min(0, desiredCapacityChange);
  const capitalAccess = Math.max(0, firm.capital + 0.45 * debt);
  const capacityChange = 0.32 * contraction + 0.32 * expansion * capitalAccess / (0.35 + capitalAccess);
  const desiredDebt = policy.capital * Math.max(firm.capital, 0.1);
  const debtChange = 0.45 * (desiredDebt - debt);
  const scarcity = Math.tanh(demand - firm.capacity);
  const productPricingPower = 0.16 * Math.tanh((firm.product - 0.55) / 0.55);
  const priceTarget = policy.price + productPricingPower + 0.12 * scarcity;
  const priceChange = 0.85 * (priceTarget - firm.price);
  const productChange = 0.72 * productiveResearch - 0.11 * firm.product;
  const revenue = Math.max(0.08, firm.price) * fulfilled;
  const variableCost = 0.38 * fulfilled;
  const capacityCost = 0.13 * Math.max(0, firm.capacity);
  const expansionCost = 0.7 * Math.max(0, capacityChange);
  const interestCost = 0.075 * Math.max(0, debt);
  const profit = revenue - variableCost - capacityCost - researchSpend - expansionCost - interestCost;
  const capitalChange = profit + debtChange;
  const flows = {
    "capital-to-product": 0.72 * productiveResearch,
    "product-to-capital": -researchSpend,
    "product-to-price": productPricingPower,
    "capital-to-capacity": capacityChange,
    "capacity-to-price": 0.12 * scarcity,
    "capacity-to-capital": -(variableCost + capacityCost + expansionCost),
    "price-to-capital": revenue,
  };
  return {
    debtChange,
    derivatives: { product: productChange, price: priceChange, capacity: capacityChange, capital: capitalChange },
    flows,
    sales: fulfilled,
  };
}

export function stepCompetitiveFirms(runtime, now = Date.now(), dt = 0.1) {
  const market = computeMarket(runtime);
  const dynamics = Object.fromEntries(
    firmIds.map((id) => [id, computeFirm(runtime, id, market)]),
  );
  for (const id of firmIds) runtime.marketShares[id] += market.derivatives[id] * dt;
  const total = firmIds.reduce((sum, id) => sum + runtime.marketShares[id], 0);
  for (const id of firmIds) {
    runtime.marketShares[id] = Math.max(0, runtime.marketShares[id] / total);
    for (const variableId of variableIds) {
      runtime.firms[id][variableId] += dynamics[id].derivatives[variableId] * dt;
    }
    runtime.debts[id] = Math.max(0, runtime.debts[id] + dynamics[id].debtChange * dt);
    runtime.sales[id] = dynamics[id].sales;
    runtime.internalFlows[id] = dynamics[id].flows;
  }
  runtime.utilities = market.utilities;
  runtime.demand = market.demand;
  runtime.availability = market.availability;
  runtime.competitionFlows = market.competitionFlows;
  runtime.revision += 1;
  runtime.serverTime = now;
  if (runtime.revision % 2 === 0) {
    for (const id of firmIds) {
      const history = runtime.marketShareHistory[id];
      history.push({ id: `${runtime.runId}-${id}-${runtime.revision}`, time: now, value: runtime.marketShares[id] });
      if (history.length > 48) history.shift();
    }
  }
}

export function snapshotCompetitiveFirms(runtime) {
  return {
    runId: runtime.runId,
    revision: runtime.revision,
    serverTime: runtime.serverTime,
    marketShares: { ...runtime.marketShares },
    firms: cloneNested(runtime.firms),
    managementPolicies: cloneNested(runtime.managementPolicies),
    debts: { ...runtime.debts },
    utilities: { ...runtime.utilities },
    demand: { ...runtime.demand },
    availability: { ...runtime.availability },
    sales: { ...runtime.sales },
    competitionFlows: { ...runtime.competitionFlows },
    internalFlows: Object.fromEntries(firmIds.map((id) => [id, { ...runtime.internalFlows[id] }])),
    marketShareHistory: Object.fromEntries(firmIds.map((id) => [id, runtime.marketShareHistory[id].map((point) => ({ ...point }))])),
    lastIntervention: runtime.lastIntervention ? { ...runtime.lastIntervention } : null,
  };
}
