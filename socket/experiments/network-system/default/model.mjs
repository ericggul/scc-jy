export const nodeIds = ["1", "2", "3", "4"];
export const edgeIds = nodeIds.flatMap((from) =>
  nodeIds.map((to) => `${from}-${to}`),
);

const initialWeightRows = [
  [0.58, 0.24, 0.12, 0.06],
  [0.08, 0.58, 0.24, 0.1],
  [0.1, 0.08, 0.58, 0.24],
  [0.24, 0.12, 0.06, 0.58],
];

export function createRuntime(now = Date.now()) {
  return {
    revision: 0,
    serverTime: now,
    values: { "1": 1, "2": 0, "3": 0, "4": 0 },
    weights: Object.fromEntries(
      edgeIds.map((edgeId) => {
        const [from, to] = edgeId.split("-");
        return [edgeId, initialWeightRows[Number(from) - 1][Number(to) - 1]];
      }),
    ),
  };
}

function normalizedRow(runtime, from) {
  const row = nodeIds.map((to) => runtime.weights[`${from}-${to}`]);
  const sum = row.reduce((total, value) => total + value, 0);
  if (sum <= Number.EPSILON) return nodeIds.map(() => 1 / nodeIds.length);
  return row.map((value) => value / sum);
}

export function stepRuntime(runtime, now = Date.now()) {
  const transitionTarget = Object.fromEntries(nodeIds.map((id) => [id, 0]));

  for (const from of nodeIds) {
    const row = normalizedRow(runtime, from);
    for (let index = 0; index < nodeIds.length; index += 1) {
      transitionTarget[nodeIds[index]] += runtime.values[from] * row[index];
    }
  }

  const transitionRate = 0.08;
  runtime.values = Object.fromEntries(
    nodeIds.map((id) => [
      id,
      runtime.values[id] +
        (transitionTarget[id] - runtime.values[id]) * transitionRate,
    ]),
  );
  runtime.revision += 1;
  runtime.serverTime = now;
  return snapshotRuntime(runtime);
}

export function seedRuntime(runtime, nodeId, now = Date.now()) {
  runtime.values = Object.fromEntries(
    nodeIds.map((id) => [id, id === nodeId ? 1 : 0]),
  );
  runtime.revision += 1;
  runtime.serverTime = now;
}

export function changeWeight(runtime, edgeId, amount, now = Date.now()) {
  runtime.weights[edgeId] = Math.min(
    Math.max(runtime.weights[edgeId] + amount, 0),
    1,
  );
  runtime.revision += 1;
  runtime.serverTime = now;
}

export function snapshotRuntime(runtime) {
  return {
    revision: runtime.revision,
    serverTime: runtime.serverTime,
    values: { ...runtime.values },
    weights: { ...runtime.weights },
  };
}
