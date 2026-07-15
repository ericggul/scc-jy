const nodeIds = [
  "household-demand",
  "production",
  "inventories",
  "employment",
  "wage-share",
  "investment",
  "credit",
  "inflation",
  "policy-rate",
];

const influences = [
  { edgeId: "demand-to-production", from: "household-demand", to: "production", coefficient: 0.82 },
  { edgeId: "production-to-inventories", from: "production", to: "inventories", coefficient: 0.92 },
  { edgeId: "demand-to-inventories", from: "household-demand", to: "inventories", coefficient: -1 },
  { edgeId: "inventories-to-production", from: "inventories", to: "production", coefficient: -0.68 },
  { edgeId: "production-to-employment", from: "production", to: "employment", coefficient: 0.72 },
  { edgeId: "employment-to-wage-share", from: "employment", to: "wage-share", coefficient: 0.58 },
  { edgeId: "employment-to-demand", from: "employment", to: "household-demand", coefficient: 0.48 },
  { edgeId: "wage-share-to-demand", from: "wage-share", to: "household-demand", coefficient: 0.52 },
  { edgeId: "wage-share-to-investment", from: "wage-share", to: "investment", coefficient: -0.34 },
  { edgeId: "production-to-investment", from: "production", to: "investment", coefficient: 0.62 },
  { edgeId: "credit-to-investment", from: "credit", to: "investment", coefficient: 0.7 },
  { edgeId: "production-to-credit", from: "production", to: "credit", coefficient: 0.5 },
  { edgeId: "credit-to-demand", from: "credit", to: "household-demand", coefficient: 0.38 },
  { edgeId: "investment-to-production", from: "investment", to: "production", coefficient: 0.5 },
  { edgeId: "investment-to-employment", from: "investment", to: "employment", coefficient: 0.28 },
  { edgeId: "demand-to-inflation", from: "household-demand", to: "inflation", coefficient: 0.54 },
  { edgeId: "wage-share-to-inflation", from: "wage-share", to: "inflation", coefficient: 0.42 },
  { edgeId: "inflation-to-demand", from: "inflation", to: "household-demand", coefficient: -0.4 },
  { edgeId: "inflation-to-policy-rate", from: "inflation", to: "policy-rate", coefficient: 0.82 },
  { edgeId: "production-to-policy-rate", from: "production", to: "policy-rate", coefficient: 0.24 },
  { edgeId: "policy-rate-to-credit", from: "policy-rate", to: "credit", coefficient: -0.66 },
  { edgeId: "policy-rate-to-investment", from: "policy-rate", to: "investment", coefficient: -0.4 },
];

const edgeIds = influences.map(({ edgeId }) => edgeId);

const timeConstants = {
  "household-demand": 0.42,
  production: 0.3,
  inventories: 0.48,
  employment: 0.62,
  "wage-share": 1.1,
  investment: 0.72,
  credit: 0.9,
  inflation: 0.72,
  "policy-rate": 0.9,
};

const initialValues = {
  "household-demand": 0.12,
  production: 0.08,
  inventories: -0.04,
  employment: 0.03,
  "wage-share": 0.01,
  investment: 0.04,
  credit: 0.08,
  inflation: 0.01,
  "policy-rate": 0,
};

const HISTORY_LENGTH = 96;
const GDP_LAG_TICKS = 40;
const OUTPUT_LOG_SCALE = 0.08;
const DEFAULT_DT = 0.025;
// Numerical fuse only; this is deliberately far outside a normal economy so
// the controller can produce abnormal +50% / -60% GDP episodes.
const STATE_LIMIT = 100;
const defaultEdgeWeights = {
  ...recordFrom(edgeIds, 1),
  "demand-to-production": 1.15,
  "production-to-inventories": 0.95,
  "demand-to-inventories": 1.67,
  "inventories-to-production": 1.05,
  "employment-to-wage-share": 2.48,
  "wage-share-to-investment": 1.36,
  "wage-share-to-inflation": 2.47,
  "inflation-to-demand": 1.67,
  "inflation-to-policy-rate": 1.23,
  "policy-rate-to-investment": 1.93,
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function recordFrom(keys, value) {
  return Object.fromEntries(keys.map((key) => [key, value]));
}

function outputLogFromProduction(production) {
  return Math.log(100) + OUTPUT_LOG_SCALE * production;
}

function outputLevelFromLog(outputLog) {
  return Math.exp(outputLog);
}

let runSequence = 0;

function createRunId(now) {
  runSequence += 1;
  return `${now.toString(36)}-${runSequence.toString(36)}`;
}

export function createCycleRuntime(now = Date.now(), runId = createRunId(now)) {
  const initialOutputLog = outputLogFromProduction(initialValues.production);

  return {
    runId,
    revision: 0,
    serverTime: now,
    values: { ...initialValues },
    history: Object.fromEntries(
      nodeIds.map((nodeId) => [
        nodeId,
        Array.from({ length: HISTORY_LENGTH }, () => initialValues[nodeId]),
      ]),
    ),
    edgeWeights: { ...defaultEdgeWeights },
    edgeFlows: recordFrom(edgeIds, 0),
    outputLogHistory: Array.from(
      { length: GDP_LAG_TICKS + 1 },
      () => initialOutputLog,
    ),
    outputLevel: outputLevelFromLog(initialOutputLog),
    gdpGrowth: 0,
    lastIntervention: null,
  };
}

export function resetCycle(runtime, now = Date.now()) {
  Object.assign(runtime, createCycleRuntime(now));
  return runtime;
}

export function applyCycleIntervention(runtime, intervention, now = Date.now()) {
  const amount = clamp(intervention.amount, -1, 1);

  if (intervention.kind === "node-shock" && nodeIds.includes(intervention.nodeId)) {
    runtime.values[intervention.nodeId] = clamp(
      runtime.values[intervention.nodeId] + amount * 0.28,
      -STATE_LIMIT,
      STATE_LIMIT,
    );
    runtime.lastIntervention = {
      kind: "node-shock",
      nodeId: intervention.nodeId,
      amount,
      appliedAt: now,
    };
    return true;
  }

  if (intervention.kind === "edge-weight" && edgeIds.includes(intervention.edgeId)) {
    runtime.edgeWeights[intervention.edgeId] = clamp(
      runtime.edgeWeights[intervention.edgeId] + amount * 0.5,
      0,
      20,
    );
    runtime.lastIntervention = {
      kind: "edge-weight",
      edgeId: intervention.edgeId,
      amount,
      appliedAt: now,
    };
    return true;
  }

  return false;
}

export function stepCycle(runtime, now = Date.now(), dt = DEFAULT_DT) {
  const safeDt = clamp(dt, 0.001, 0.1);
  const derivatives = Object.fromEntries(
    nodeIds.map((nodeId) => [
      nodeId,
      -runtime.values[nodeId] / timeConstants[nodeId],
    ]),
  );
  const edgeFlows = recordFrom(edgeIds, 0);

  for (const influence of influences) {
    const flow =
      runtime.edgeWeights[influence.edgeId] *
      influence.coefficient *
      Math.tanh(runtime.values[influence.from]);
    derivatives[influence.to] += flow / timeConstants[influence.to];
    edgeFlows[influence.edgeId] = flow;
  }

  // Credit creation becomes self-limiting as leverage grows. This local,
  // nonlinear balance prevents an easy-credit loop from diverging forever.
  derivatives.credit -= 0.16 * runtime.values.credit ** 3;

  for (const nodeId of nodeIds) {
    runtime.values[nodeId] = clamp(
      runtime.values[nodeId] + derivatives[nodeId] * safeDt,
      -STATE_LIMIT,
      STATE_LIMIT,
    );
  }

  const outputLog = outputLogFromProduction(runtime.values.production);
  runtime.outputLogHistory.push(outputLog);
  if (runtime.outputLogHistory.length > GDP_LAG_TICKS + 1) {
    runtime.outputLogHistory.shift();
  }
  const annualLagLog = runtime.outputLogHistory[0];
  runtime.outputLevel = outputLevelFromLog(outputLog);
  runtime.gdpGrowth = 100 * (outputLog - annualLagLog);
  runtime.edgeFlows = edgeFlows;
  runtime.revision += 1;
  runtime.serverTime = now;

  if (runtime.revision % 2 === 0) {
    for (const nodeId of nodeIds) {
      const history = runtime.history[nodeId];
      history.push(runtime.values[nodeId]);
      if (history.length > HISTORY_LENGTH) history.shift();
    }
  }

  return runtime;
}

export function snapshotCycle(runtime) {
  return {
    runId: runtime.runId,
    revision: runtime.revision,
    serverTime: runtime.serverTime,
    values: { ...runtime.values },
    history: Object.fromEntries(
      nodeIds.map((nodeId) => [nodeId, [...runtime.history[nodeId]]]),
    ),
    edgeWeights: { ...runtime.edgeWeights },
    edgeFlows: { ...runtime.edgeFlows },
    outputLevel: runtime.outputLevel,
    gdpGrowth: runtime.gdpGrowth,
    lastIntervention: runtime.lastIntervention
      ? { ...runtime.lastIntervention }
      : null,
  };
}

export const cycleModelIds = { edgeIds, nodeIds };
export const cycleInfluences = influences;
export const cycleModelTiming = {
  defaultDt: DEFAULT_DT,
  gdpLagTicks: GDP_LAG_TICKS,
  simulatedYearsPerRealSecond: 0.25,
};
