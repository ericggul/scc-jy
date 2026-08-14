export type ContactOrder = "sequenced" | "permuted";

export type TemporalContact = {
  id: number;
  a: number;
  b: number;
  start: number;
  duration: number;
  capacity: number;
  kind: "local" | "bridge";
};

export type ScheduledShock = {
  id: number;
  node: number;
  at: number;
  severity: number;
};

export type RepairFault = {
  id: number;
  node: number;
  createdAt: number;
  initialSeverity: number;
  remaining: number;
  resolvedAt: number | null;
};

export type FaultKnowledge = {
  faultId: number;
  learnedAt: number;
  via: number | null;
};

export type AidPacket = {
  id: number;
  faultId: number;
  origin: number;
  holder: number;
  amount: number;
  createdAt: number;
  hops: number;
};

export type RelationMemory = {
  key: string;
  strength: number;
};

export type TemporalNode = {
  id: number;
  reserve: number;
  practice: number;
  knowledge: FaultKnowledge[];
  resolutions: number;
};

export type TransferTrace = {
  id: number;
  at: number;
  source: number;
  target: number;
  faultId: number;
  kind: "knowledge" | "aid" | "repair";
  amount: number;
};

export type TemporalRepairEvents = {
  shocks: number;
  knowledgeTransfers: number;
  aidTransfers: number;
  resolved: number;
};

export type TemporalRepairParameters = {
  localRepair: number;
  reserveRecovery: number;
  learningGain: number;
  trustDecay: number;
};

export type TemporalRepairState = {
  time: number;
  seed: number;
  contactOrder: ContactOrder;
  nodes: TemporalNode[];
  contacts: TemporalContact[];
  scheduledShocks: ScheduledShock[];
  faults: RepairFault[];
  packets: AidPacket[];
  relationMemory: RelationMemory[];
  traces: TransferTrace[];
  nextContactIndex: number;
  nextShockIndex: number;
  nextFaultId: number;
  nextPacketId: number;
  nextTraceId: number;
};

export type TemporalRepairStep = {
  state: TemporalRepairState;
  events: TemporalRepairEvents;
};

export type TemporalRepairMetrics = {
  meanService: number;
  unresolved: number;
  resolved: number;
  meanPractice: number;
  packets: number;
  reachability: number;
};

export const DEFAULT_TEMPORAL_REPAIR_PARAMETERS: TemporalRepairParameters = {
  localRepair: 0.018,
  reserveRecovery: 0.024,
  learningGain: 0.052,
  trustDecay: 0.006,
};

const NODE_COUNT = 12;
const SCHEDULE_HORIZON = 420;
const TRACE_LIFETIME = 15;
const MAX_ACTIVE_PACKETS = 42;
const EPSILON = 1e-8;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex]!;
    next[swapIndex] = current!;
  }
  return next;
}

function makePairOptions() {
  const pairs: Array<{
    a: number;
    b: number;
    kind: TemporalContact["kind"];
    weight: number;
  }> = [];
  const keys = new Set<string>();
  const add = (
    a: number,
    b: number,
    kind: TemporalContact["kind"],
    weight: number,
  ) => {
    const normalizedA = ((a % NODE_COUNT) + NODE_COUNT) % NODE_COUNT;
    const normalizedB = ((b % NODE_COUNT) + NODE_COUNT) % NODE_COUNT;
    const key = pairKey(normalizedA, normalizedB);
    if (normalizedA === normalizedB || keys.has(key)) return;
    keys.add(key);
    pairs.push({ a: normalizedA, b: normalizedB, kind, weight });
  };

  for (let node = 0; node < NODE_COUNT; node += 1) {
    add(node, node + 1, "local", 1.6);
    add(node, node + 2, "local", 0.7);
  }
  add(0, 6, "bridge", 0.35);
  add(1, 8, "bridge", 0.3);
  add(3, 9, "bridge", 0.27);
  add(4, 10, "bridge", 0.24);
  add(2, 11, "bridge", 0.22);
  return pairs;
}

function choosePair(
  pairs: ReturnType<typeof makePairOptions>,
  random: () => number,
  previous: string | null,
  burstRemaining: number,
) {
  const weighted = pairs.map((pair) => {
    const samePair = pairKey(pair.a, pair.b) === previous;
    const burstWeight = samePair && burstRemaining > 0 ? 4.6 : 1;
    return pair.weight * burstWeight;
  });
  const total = weighted.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * total;
  for (let index = 0; index < pairs.length; index += 1) {
    cursor -= weighted[index] ?? 0;
    if (cursor <= 0) return pairs[index]!;
  }
  return pairs[pairs.length - 1]!;
}

function generateContacts(seed: number) {
  let randomState = (seed ^ 0x8ad8b1d3) >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const pairs = makePairOptions();
  const contacts: TemporalContact[] = [];
  let time = 0.32 + random() * 0.38;
  let previous: string | null = null;
  let burstRemaining = 0;

  while (time < SCHEDULE_HORIZON) {
    const pair = choosePair(pairs, random, previous, burstRemaining);
    const key = pairKey(pair.a, pair.b);
    contacts.push({
      id: contacts.length + 1,
      a: pair.a,
      b: pair.b,
      start: time,
      duration: 0.12 + random() * 0.08,
      capacity: 0.09 + random() * 0.11,
      kind: pair.kind,
    });

    if (key === previous && burstRemaining > 0) {
      burstRemaining -= 1;
      time += 0.25 + random() * 0.19;
    } else if (random() < 0.36) {
      previous = key;
      burstRemaining = 1 + Math.floor(random() * 3);
      time += 0.24 + random() * 0.18;
    } else {
      previous = key;
      burstRemaining = 0;
      time += 0.42 + random() * 1.18;
    }
  }
  return contacts;
}

function permuteContactTimes(contacts: readonly TemporalContact[], seed: number) {
  let randomState = (seed ^ 0x3e1f09ab) >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const assignedTimes = shuffle(
    contacts.map((contact) => contact.start),
    random,
  );
  return contacts
    .map((contact, index) => ({
      ...contact,
      start: assignedTimes[index] ?? contact.start,
    }))
    .sort((left, right) => left.start - right.start)
    .map((contact, index) => ({ ...contact, id: index + 1 }));
}

function generateScheduledShocks(seed: number) {
  let randomState = (seed ^ 0x4a6f82e1) >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const shocks: ScheduledShock[] = [];
  let time = 7.5 + random() * 3.5;
  while (time < SCHEDULE_HORIZON) {
    shocks.push({
      id: shocks.length + 1,
      node: Math.floor(random() * NODE_COUNT),
      at: time,
      severity: 0.17 + random() * 0.18,
    });
    time += 7.5 + random() * 5.8;
  }
  return shocks;
}

function createNodes(): TemporalNode[] {
  return Array.from({ length: NODE_COUNT }, (_, id) => ({
    id,
    reserve: 0.44 + ((id * 17) % 9) * 0.026,
    practice: 0.05 + ((id * 11) % 7) * 0.008,
    knowledge: [],
    resolutions: 0,
  }));
}

export function createTemporalRepairState({
  seed = 0x4e8f51c3,
  contactOrder = "sequenced",
  contacts,
  scheduledShocks,
}: {
  seed?: number;
  contactOrder?: ContactOrder;
  contacts?: readonly TemporalContact[];
  scheduledShocks?: readonly ScheduledShock[];
} = {}): TemporalRepairState {
  const sequenced = contacts ? [...contacts] : generateContacts(seed);
  const orderedContacts = contactOrder === "permuted"
    ? permuteContactTimes(sequenced, seed)
    : sequenced.map((contact, index) => ({ ...contact, id: index + 1 }));

  return {
    time: 0,
    seed,
    contactOrder,
    nodes: createNodes(),
    contacts: orderedContacts.sort((left, right) => left.start - right.start),
    scheduledShocks: scheduledShocks
      ? [...scheduledShocks].sort((left, right) => left.at - right.at)
      : generateScheduledShocks(seed),
    faults: [],
    packets: [],
    relationMemory: [],
    traces: [],
    nextContactIndex: 0,
    nextShockIndex: 0,
    nextFaultId: 1,
    nextPacketId: 1,
    nextTraceId: 1,
  };
}

function getRelationStrength(memory: readonly RelationMemory[], a: number, b: number) {
  return memory.find((relation) => relation.key === pairKey(a, b))?.strength ?? 0;
}

function reinforceRelation(
  memory: readonly RelationMemory[],
  a: number,
  b: number,
  amount: number,
) {
  const key = pairKey(a, b);
  const existing = memory.find((relation) => relation.key === key);
  if (!existing) return [...memory, { key, strength: clamp(amount, 0, 1) }];
  return memory.map((relation) => relation.key === key
    ? { ...relation, strength: clamp(relation.strength + amount, 0, 1) }
    : relation);
}

function decayRelationMemory(memory: readonly RelationMemory[], amount: number) {
  return memory
    .map((relation) => ({
      ...relation,
      strength: Math.max(0, relation.strength - amount),
    }))
    .filter((relation) => relation.strength > 0.002);
}

function nodeById(nodes: readonly TemporalNode[], id: number) {
  return nodes.find((node) => node.id === id);
}

function unresolvedFaultById(faults: readonly RepairFault[], id: number) {
  return faults.find((fault) => fault.id === id && fault.resolvedAt === null);
}

function addKnowledge(
  nodes: TemporalNode[],
  nodeId: number,
  knowledge: readonly FaultKnowledge[],
  at: number,
  sender: number,
) {
  const node = nodeById(nodes, nodeId);
  if (!node) return [] as number[];
  const known = new Set(node.knowledge.map((entry) => entry.faultId));
  const added: number[] = [];
  for (const entry of knowledge) {
    if (known.has(entry.faultId)) continue;
    node.knowledge.push({ faultId: entry.faultId, learnedAt: at, via: sender });
    known.add(entry.faultId);
    added.push(entry.faultId);
  }
  return added;
}

function addTrace(
  traces: TransferTrace[],
  trace: Omit<TransferTrace, "id">,
  nextTraceId: number,
) {
  traces.push({ ...trace, id: nextTraceId });
  return nextTraceId + 1;
}

function resolveFault(
  faults: RepairFault[],
  nodes: TemporalNode[],
  faultId: number,
  at: number,
  parameters: TemporalRepairParameters,
  events: TemporalRepairEvents,
) {
  const fault = unresolvedFaultById(faults, faultId);
  if (!fault || fault.remaining > EPSILON) return;
  fault.remaining = 0;
  fault.resolvedAt = at;
  const owner = nodeById(nodes, fault.node);
  if (owner) {
    owner.practice = clamp(
      owner.practice + parameters.learningGain * (0.7 + fault.initialSeverity),
      0,
      0.92,
    );
    owner.reserve = clamp(owner.reserve + 0.08, 0, 1);
    owner.resolutions += 1;
  }
  events.resolved += 1;
}

function chooseCommitment(
  node: TemporalNode,
  faults: readonly RepairFault[],
  packets: readonly AidPacket[],
) {
  if (node.reserve < 0.18 || packets.length >= MAX_ACTIVE_PACKETS) return null;
  const packeted = new Set(
    packets.filter((packet) => packet.origin === node.id).map((packet) => packet.faultId),
  );
  const candidates = node.knowledge
    .map((entry) => unresolvedFaultById(faults, entry.faultId))
    .filter((fault): fault is RepairFault => Boolean(fault && fault.node !== node.id))
    .filter((fault) => !packeted.has(fault.id))
    .sort((left, right) => right.remaining - left.remaining);
  return candidates[0] ?? null;
}

function cloneState(state: TemporalRepairState) {
  return {
    ...state,
    nodes: state.nodes.map((node) => ({
      ...node,
      knowledge: node.knowledge.map((entry) => ({ ...entry })),
    })),
    faults: state.faults.map((fault) => ({ ...fault })),
    packets: state.packets.map((packet) => ({ ...packet })),
    relationMemory: state.relationMemory.map((relation) => ({ ...relation })),
    traces: state.traces.map((trace) => ({ ...trace })),
  };
}

export function introduceShock(
  state: TemporalRepairState,
  nodeId: number,
  severity = 0.3,
): TemporalRepairState {
  const next = cloneState(state);
  const node = nodeById(next.nodes, nodeId);
  if (!node) return state;
  const fault: RepairFault = {
    id: next.nextFaultId,
    node: nodeId,
    createdAt: next.time,
    initialSeverity: clamp(severity, 0.04, 0.72),
    remaining: clamp(severity, 0.04, 0.72),
    resolvedAt: null,
  };
  next.nextFaultId += 1;
  next.faults.push(fault);
  node.knowledge.push({ faultId: fault.id, learnedAt: next.time, via: null });
  return next;
}

function processShock(
  state: TemporalRepairState,
  shock: ScheduledShock,
  events: TemporalRepairEvents,
) {
  const node = nodeById(state.nodes, shock.node);
  if (!node) return;
  const fault: RepairFault = {
    id: state.nextFaultId,
    node: shock.node,
    createdAt: shock.at,
    initialSeverity: shock.severity,
    remaining: shock.severity,
    resolvedAt: null,
  };
  state.nextFaultId += 1;
  state.faults.push(fault);
  node.knowledge.push({ faultId: fault.id, learnedAt: shock.at, via: null });
  events.shocks += 1;
}

function processContact(
  state: TemporalRepairState,
  contact: TemporalContact,
  parameters: TemporalRepairParameters,
  events: TemporalRepairEvents,
) {
  const left = nodeById(state.nodes, contact.a);
  const right = nodeById(state.nodes, contact.b);
  if (!left || !right) return;
  const timestamp = contact.start + contact.duration;
  const leftKnowledge = left.knowledge
    .filter((entry) => entry.learnedAt <= contact.start + EPSILON)
    .map((entry) => ({ ...entry }));
  const rightKnowledge = right.knowledge
    .filter((entry) => entry.learnedAt <= contact.start + EPSILON)
    .map((entry) => ({ ...entry }));
  const leftAdded = addKnowledge(
    state.nodes,
    left.id,
    rightKnowledge,
    timestamp,
    right.id,
  );
  const rightAdded = addKnowledge(
    state.nodes,
    right.id,
    leftKnowledge,
    timestamp,
    left.id,
  );

  for (const faultId of leftAdded) {
    state.nextTraceId = addTrace(state.traces, {
      at: timestamp,
      source: right.id,
      target: left.id,
      faultId,
      kind: "knowledge",
      amount: 0,
    }, state.nextTraceId);
    events.knowledgeTransfers += 1;
  }
  for (const faultId of rightAdded) {
    state.nextTraceId = addTrace(state.traces, {
      at: timestamp,
      source: left.id,
      target: right.id,
      faultId,
      kind: "knowledge",
      amount: 0,
    }, state.nextTraceId);
    events.knowledgeTransfers += 1;
  }

  const packetSnapshot = state.packets
    .filter((packet) => packet.createdAt <= contact.start + EPSILON)
    .map((packet) => ({ ...packet }));
  const delivered = new Set<number>();
  for (const packet of packetSnapshot) {
    if (packet.holder !== left.id && packet.holder !== right.id) continue;
    const holder = packet.holder === left.id ? left : right;
    const other = holder.id === left.id ? right : left;
    const fault = unresolvedFaultById(state.faults, packet.faultId);
    if (!fault) {
      delivered.add(packet.id);
      continue;
    }

    const returnKnowledge = holder.knowledge.find(
      (entry) => entry.faultId === packet.faultId,
    );
    const returnHop = returnKnowledge?.via;
    if (returnHop === null || returnHop === undefined || other.id !== returnHop) continue;

    if (other.id === fault.node) {
      const trust = getRelationStrength(state.relationMemory, holder.id, other.id);
      const deliveredAmount = Math.min(
        packet.amount,
        contact.capacity * (0.72 + trust * 0.72),
      );
      fault.remaining -= deliveredAmount;
      delivered.add(packet.id);
      state.relationMemory = reinforceRelation(
        state.relationMemory,
        holder.id,
        other.id,
        0.035 + deliveredAmount * 0.24,
      );
      const origin = nodeById(state.nodes, packet.origin);
      if (origin) origin.practice = clamp(origin.practice + deliveredAmount * 0.045, 0, 0.92);
      state.nextTraceId = addTrace(state.traces, {
        at: timestamp,
        source: holder.id,
        target: other.id,
        faultId: fault.id,
        kind: "repair",
        amount: deliveredAmount,
      }, state.nextTraceId);
      events.aidTransfers += 1;
      resolveFault(state.faults, state.nodes, fault.id, timestamp, parameters, events);
      continue;
    }
    const actualPacket = state.packets.find((candidate) => candidate.id === packet.id);
    if (!actualPacket) continue;
    actualPacket.holder = other.id;
    actualPacket.hops += 1;
    state.relationMemory = reinforceRelation(
      state.relationMemory,
      holder.id,
      other.id,
      0.018,
    );
    state.nextTraceId = addTrace(state.traces, {
      at: timestamp,
      source: holder.id,
      target: other.id,
      faultId: fault.id,
      kind: "aid",
      amount: actualPacket.amount,
    }, state.nextTraceId);
    events.aidTransfers += 1;
  }
  state.packets = state.packets.filter((packet) => !delivered.has(packet.id));

  for (const node of [left, right]) {
    const fault = chooseCommitment(node, state.faults, state.packets);
    if (!fault) continue;
    const amount = Math.min(
      fault.remaining * 0.54,
      0.1 + node.practice * 0.08,
      node.reserve * 0.48,
    );
    if (amount <= EPSILON) continue;
    node.reserve = Math.max(0, node.reserve - amount);
    state.packets.push({
      id: state.nextPacketId,
      faultId: fault.id,
      origin: node.id,
      holder: node.id,
      amount,
      createdAt: timestamp,
      hops: 0,
    });
    state.nextPacketId += 1;
  }
}

function applyLocalRepair(
  state: TemporalRepairState,
  delta: number,
  parameters: TemporalRepairParameters,
  events: TemporalRepairEvents,
) {
  for (const node of state.nodes) {
    const ownFaults = state.faults.filter(
      (fault) => fault.node === node.id && fault.resolvedAt === null,
    );
    if (ownFaults.length === 0) {
      node.reserve = clamp(node.reserve + parameters.reserveRecovery * delta, 0, 1);
      continue;
    }
    const repairRate = parameters.localRepair * (1 + node.practice * 1.7);
    const dividedRate = repairRate * delta / ownFaults.length;
    for (const fault of ownFaults) {
      fault.remaining -= dividedRate;
      resolveFault(state.faults, state.nodes, fault.id, state.time, parameters, events);
    }
  }
}

function advanceContinuousState(
  state: TemporalRepairState,
  until: number,
  parameters: TemporalRepairParameters,
  events: TemporalRepairEvents,
) {
  const duration = Math.max(0, until - state.time);
  if (duration <= EPSILON) {
    state.time = until;
    return;
  }
  state.time = until;
  applyLocalRepair(state, duration, parameters, events);
  state.relationMemory = decayRelationMemory(
    state.relationMemory,
    parameters.trustDecay * duration,
  );
}

export function stepTemporalRepairNetwork(
  state: TemporalRepairState,
  delta: number,
  parameters: TemporalRepairParameters = DEFAULT_TEMPORAL_REPAIR_PARAMETERS,
): TemporalRepairStep {
  const next = cloneState(state);
  const events: TemporalRepairEvents = {
    shocks: 0,
    knowledgeTransfers: 0,
    aidTransfers: 0,
    resolved: 0,
  };
  const elapsed = clamp(delta, 0, 0.12);
  const end = next.time + elapsed;

  while (true) {
    const shockAt = next.scheduledShocks[next.nextShockIndex]?.at ?? Number.POSITIVE_INFINITY;
    const contact = next.contacts[next.nextContactIndex];
    const contactAt = contact ? contact.start + contact.duration : Number.POSITIVE_INFINITY;
    const eventAt = Math.min(shockAt, contactAt);
    if (eventAt > end + EPSILON) break;

    advanceContinuousState(next, eventAt, parameters, events);
    while (
      next.nextShockIndex < next.scheduledShocks.length &&
      Math.abs((next.scheduledShocks[next.nextShockIndex]?.at ?? Number.POSITIVE_INFINITY) - eventAt) <= EPSILON
    ) {
      const shock = next.scheduledShocks[next.nextShockIndex];
      if (shock) processShock(next, shock, events);
      next.nextShockIndex += 1;
    }
    while (
      next.nextContactIndex < next.contacts.length &&
      Math.abs(
        ((next.contacts[next.nextContactIndex]?.start ?? Number.POSITIVE_INFINITY) +
          (next.contacts[next.nextContactIndex]?.duration ?? 0)) - eventAt,
      ) <= EPSILON
    ) {
      const scheduledContact = next.contacts[next.nextContactIndex];
      if (scheduledContact) processContact(next, scheduledContact, parameters, events);
      next.nextContactIndex += 1;
    }
  }

  advanceContinuousState(next, end, parameters, events);
  next.traces = next.traces.filter((trace) => end - trace.at <= TRACE_LIFETIME);
  return { state: next, events };
}

function serviceAtNode(state: TemporalRepairState, nodeId: number) {
  const damage = state.faults
    .filter((fault) => fault.node === nodeId && fault.resolvedAt === null)
    .reduce((sum, fault) => sum + fault.remaining, 0);
  return clamp(1 - damage, 0, 1);
}

export function getTemporalRepairMetrics(state: TemporalRepairState): TemporalRepairMetrics {
  const reached = state.nodes.filter((node) => node.knowledge.length > 0).length;
  return {
    meanService: state.nodes.reduce(
      (sum, node) => sum + serviceAtNode(state, node.id),
      0,
    ) / state.nodes.length,
    unresolved: state.faults.filter((fault) => fault.resolvedAt === null).length,
    resolved: state.faults.filter((fault) => fault.resolvedAt !== null).length,
    meanPractice: state.nodes.reduce((sum, node) => sum + node.practice, 0) / state.nodes.length,
    packets: state.packets.length,
    reachability: reached / state.nodes.length,
  };
}

export function getNodeService(state: TemporalRepairState, nodeId: number) {
  return serviceAtNode(state, nodeId);
}

export function getLocalRepairRate(
  node: TemporalNode,
  parameters: TemporalRepairParameters = DEFAULT_TEMPORAL_REPAIR_PARAMETERS,
) {
  return parameters.localRepair * (1 + node.practice * 1.7);
}
