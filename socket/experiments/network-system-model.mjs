const institutionIds = [
  "central-bank",
  "treasury",
  "banks",
  "private-economy",
];

const edgeIds = [
  "central-bank-to-treasury",
  "treasury-to-central-bank",
  "central-bank-to-banks",
  "banks-to-central-bank",
  "central-bank-to-private-economy",
  "private-economy-to-central-bank",
  "treasury-to-banks",
  "banks-to-treasury",
  "treasury-to-private-economy",
  "private-economy-to-treasury",
  "banks-to-private-economy",
  "private-economy-to-banks",
];

const initialValues = {
  "central-bank": 0.15,
  treasury: 0.12,
  banks: 0.18,
  "private-economy": 0.16,
};

const baselineValues = {
  "central-bank": 0.08,
  treasury: 0.08,
  banks: 0.12,
  "private-economy": 0.1,
};

const baselineAdjustment = {
  "central-bank": 0.34,
  treasury: 0.28,
  banks: 0.3,
  "private-economy": 0.32,
};

// Each directed influence has its own persistent weight.
const influences = [
  {
    edgeId: "central-bank-to-treasury",
    from: "central-bank",
    to: "treasury",
    coefficient: -0.38,
  },
  {
    edgeId: "treasury-to-central-bank",
    from: "treasury",
    to: "central-bank",
    coefficient: 0.3,
  },
  {
    edgeId: "central-bank-to-banks",
    from: "central-bank",
    to: "banks",
    coefficient: -0.62,
  },
  {
    edgeId: "banks-to-central-bank",
    from: "banks",
    to: "central-bank",
    coefficient: 0.18,
  },
  {
    edgeId: "central-bank-to-private-economy",
    from: "central-bank",
    to: "private-economy",
    coefficient: -0.42,
  },
  {
    edgeId: "private-economy-to-central-bank",
    from: "private-economy",
    to: "central-bank",
    coefficient: 0.48,
  },
  {
    edgeId: "treasury-to-banks",
    from: "treasury",
    to: "banks",
    coefficient: 0.22,
  },
  {
    edgeId: "banks-to-treasury",
    from: "banks",
    to: "treasury",
    coefficient: 0.12,
  },
  {
    edgeId: "treasury-to-private-economy",
    from: "treasury",
    to: "private-economy",
    coefficient: 0.58,
  },
  {
    edgeId: "private-economy-to-treasury",
    from: "private-economy",
    to: "treasury",
    coefficient: -0.3,
  },
  {
    edgeId: "banks-to-private-economy",
    from: "banks",
    to: "private-economy",
    coefficient: 0.65,
  },
  {
    edgeId: "private-economy-to-banks",
    from: "private-economy",
    to: "banks",
    coefficient: 0.34,
  },
];

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function recordFrom(keys, value) {
  return Object.fromEntries(keys.map((key) => [key, value]));
}

let runSequence = 0;

function createRunId(now) {
  runSequence += 1;
  return `${now.toString(36)}-${runSequence.toString(36)}`;
}

export function createNetworkSystemRuntime(
  now = Date.now(),
  runId = createRunId(now),
) {
  return {
    runId,
    revision: 0,
    serverTime: now,
    values: { ...initialValues },
    history: Object.fromEntries(
      institutionIds.map((institutionId) => [
        institutionId,
        Array.from({ length: 48 }, () => initialValues[institutionId]),
      ]),
    ),
    edgeWeights: recordFrom(edgeIds, 1),
    edgeFlows: recordFrom(edgeIds, 0),
    lastIntervention: null,
  };
}

export function resetNetworkSystem(runtime, now = Date.now()) {
  const resetRuntime = createNetworkSystemRuntime(now);
  Object.assign(runtime, resetRuntime);
  return runtime;
}

export function applyNetworkSystemIntervention(
  runtime,
  intervention,
  now = Date.now(),
) {
  const amount = clamp(intervention.amount, -1, 1);

  if (
    intervention.kind === "node-shock" &&
    institutionIds.includes(intervention.institutionId)
  ) {
    runtime.values[intervention.institutionId] += amount * 0.24;
    runtime.lastIntervention = {
      kind: "node-shock",
      institutionId: intervention.institutionId,
      amount,
      appliedAt: now,
    };
    return true;
  }

  if (
    intervention.kind === "edge-weight" &&
    edgeIds.includes(intervention.edgeId)
  ) {
    runtime.edgeWeights[intervention.edgeId] = clamp(
      runtime.edgeWeights[intervention.edgeId] + amount * 0.38,
      0.1,
      10,
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

export function stepNetworkSystem(runtime, now = Date.now(), dt = 0.1) {
  const derivatives = Object.fromEntries(
    institutionIds.map((institutionId) => [
      institutionId,
      baselineAdjustment[institutionId] *
        (baselineValues[institutionId] - runtime.values[institutionId]),
    ]),
  );
  const edgeFlows = recordFrom(edgeIds, 0);

  for (const influence of influences) {
    const contribution =
      runtime.edgeWeights[influence.edgeId] *
      influence.coefficient *
      Math.tanh(runtime.values[influence.from]);

    derivatives[influence.to] += contribution;

    edgeFlows[influence.edgeId] = contribution;
  }

  for (const institutionId of institutionIds) {
    runtime.values[institutionId] += derivatives[institutionId] * dt;
  }

  runtime.edgeFlows = edgeFlows;
  runtime.revision += 1;
  runtime.serverTime = now;

  if (runtime.revision % 2 === 0) {
    for (const institutionId of institutionIds) {
      const history = runtime.history[institutionId];
      history.push(runtime.values[institutionId]);
      if (history.length > 48) history.shift();
    }
  }
}

export function snapshotNetworkSystem(runtime) {
  return {
    runId: runtime.runId,
    revision: runtime.revision,
    serverTime: runtime.serverTime,
    values: { ...runtime.values },
    history: Object.fromEntries(
      institutionIds.map((institutionId) => [
        institutionId,
        [...runtime.history[institutionId]],
      ]),
    ),
    edgeWeights: { ...runtime.edgeWeights },
    edgeFlows: { ...runtime.edgeFlows },
    lastIntervention: runtime.lastIntervention
      ? { ...runtime.lastIntervention }
      : null,
  };
}

export const networkSystemModelIds = {
  edgeIds,
  institutionIds,
};

export const networkSystemInfluences = influences;
