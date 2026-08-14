export type Point = { readonly x: number; readonly y: number };

export type RecruitmentState = "N" | "S" | "R";

export type RecruitmentAgent = Point & {
  readonly id: number;
  state: RecruitmentState;
  bornAt: number;
};

export type RecruitmentRelation = {
  readonly id: number;
  source: number;
  target: number;
  bornAt: number;
  changedAt: number;
};

export type OpenAdaptiveNetwork = {
  agents: readonly RecruitmentAgent[];
  relations: readonly RecruitmentRelation[];
  randomState: number;
  time: number;
  nextAgentId: number;
  nextRelationId: number;
};

export type CoevolutionParameters = {
  recruitment: number;
  rewiring: number;
  entry: number;
  turnover: number;
};

export type CoevolutionEvents = {
  entries: number;
  exits: number;
  susceptible: number;
  resistant: number;
  recruited: number;
  rewires: number;
};

export type CoevolutionStep = {
  network: OpenAdaptiveNetwork;
  events: CoevolutionEvents;
};

export type CoevolutionMeasure = {
  components: number;
  meanDegree: number;
  nonSusceptible: number;
  susceptible: number;
  recruiters: number;
};

export const DEFAULT_COEVOLUTION_PARAMETERS: CoevolutionParameters = {
  recruitment: 0.64,
  rewiring: 0.72,
  entry: 0.64,
  turnover: 0.6,
};

const INITIAL_AGENTS = 78;
const MIN_AGENTS = 28;
const MAX_AGENTS = 136;
const ENTRY_DEGREE = 2;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function relationKey(source: number, target: number) {
  return source < target ? `${source}:${target}` : `${target}:${source}`;
}

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function eventOccurs(rate: number, delta: number, random: () => number) {
  return random() < 1 - Math.exp(-Math.max(0, rate) * delta);
}

function randomStateFor(index: number) {
  if (index < 8) return "R" as const;
  if (index < 24) return "S" as const;
  return "N" as const;
}

function makeAgent(
  id: number,
  state: RecruitmentState,
  width: number,
  height: number,
  time: number,
  random: () => number,
  anchor?: Point,
): RecruitmentAgent {
  const margin = Math.max(28, Math.min(width, height) * 0.075);
  const radius = 26 + random() * 56;
  const angle = random() * Math.PI * 2;
  const x = anchor
    ? clamp(anchor.x + Math.cos(angle) * radius, margin, Math.max(margin, width - margin))
    : margin + random() * Math.max(1, width - margin * 2);
  const y = anchor
    ? clamp(anchor.y + Math.sin(angle) * radius, margin, Math.max(margin, height - margin))
    : margin + random() * Math.max(1, height - margin * 2);
  return { id, x, y, state, bornAt: time };
}

function neighbourMap(relations: readonly RecruitmentRelation[]) {
  const neighbours = new Map<number, number[]>();
  for (const relation of relations) {
    neighbours.set(relation.source, [
      ...(neighbours.get(relation.source) ?? []),
      relation.target,
    ]);
    neighbours.set(relation.target, [
      ...(neighbours.get(relation.target) ?? []),
      relation.source,
    ]);
  }
  return neighbours;
}

function countComponents(
  agents: readonly RecruitmentAgent[],
  relations: readonly RecruitmentRelation[],
) {
  const neighbours = neighbourMap(relations);
  const seen = new Set<number>();
  let components = 0;
  for (const agent of agents) {
    if (seen.has(agent.id)) continue;
    components += 1;
    const pending = [agent.id];
    seen.add(agent.id);
    while (pending.length > 0) {
      const current = pending.pop();
      if (current === undefined) continue;
      for (const neighbour of neighbours.get(current) ?? []) {
        if (seen.has(neighbour)) continue;
        seen.add(neighbour);
        pending.push(neighbour);
      }
    }
  }
  return components;
}

export function measureCoevolution(network: OpenAdaptiveNetwork): CoevolutionMeasure {
  let nonSusceptible = 0;
  let susceptible = 0;
  let recruiters = 0;
  for (const agent of network.agents) {
    if (agent.state === "N") nonSusceptible += 1;
    if (agent.state === "S") susceptible += 1;
    if (agent.state === "R") recruiters += 1;
  }
  return {
    components: countComponents(network.agents, network.relations),
    meanDegree: (network.relations.length * 2) / Math.max(1, network.agents.length),
    nonSusceptible,
    susceptible,
    recruiters,
  };
}

export function createCoevolvingExchangeNetwork(
  width: number,
  height: number,
  seed = 0x582a74d1,
): OpenAdaptiveNetwork {
  let randomState = seed >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const agents = Array.from({ length: INITIAL_AGENTS }, (_, index) =>
    makeAgent(index + 1, randomStateFor(index), width, height, 0, random),
  );
  const keys = new Set<string>();
  const relations: RecruitmentRelation[] = [];
  const addRelation = (source: number, target: number) => {
    const key = relationKey(source, target);
    if (source === target || keys.has(key)) return false;
    keys.add(key);
    relations.push({
      id: relations.length + 1,
      source,
      target,
      bornAt: 0,
      changedAt: -6,
    });
    return true;
  };

  for (let index = 0; index < agents.length; index += 1) {
    addRelation(agents[index]!.id, agents[(index + 1) % agents.length]!.id);
    addRelation(agents[index]!.id, agents[(index + 4) % agents.length]!.id);
  }
  while (relations.length < 182) {
    const source = agents[randomIndex(random(), agents.length)]!;
    const target = agents[randomIndex(random(), agents.length)]!;
    addRelation(source.id, target.id);
  }

  return {
    agents,
    relations,
    randomState,
    time: 0,
    nextAgentId: agents.length + 1,
    nextRelationId: relations.length + 1,
  };
}

export function resizeCoevolvingExchangeNetwork(
  network: OpenAdaptiveNetwork,
  previous: { width: number; height: number },
  next: { width: number; height: number },
): OpenAdaptiveNetwork {
  if (previous.width <= 0 || previous.height <= 0) return network;
  return {
    ...network,
    agents: network.agents.map((agent) => ({
      ...agent,
      x: agent.x * (next.width / previous.width),
      y: agent.y * (next.height / previous.height),
    })),
  };
}

function selectRandom<T>(choices: readonly T[], random: () => number) {
  if (choices.length === 0) return null;
  return choices[randomIndex(random(), choices.length)] ?? null;
}

function countRecruiterNeighbours(
  agentId: number,
  agentsById: ReadonlyMap<number, RecruitmentAgent>,
  neighbours: ReadonlyMap<number, readonly number[]>,
) {
  return (neighbours.get(agentId) ?? []).reduce((count, neighbourId) =>
    count + (agentsById.get(neighbourId)?.state === "R" ? 1 : 0), 0);
}

export function stepCoevolvingExchangeNetwork(
  network: OpenAdaptiveNetwork,
  deltaSeconds: number,
  parameters: CoevolutionParameters,
): CoevolutionStep {
  const delta = clamp(deltaSeconds, 0, 0.05);
  const time = network.time + delta;
  let randomState = network.randomState;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const events: CoevolutionEvents = {
    entries: 0,
    exits: 0,
    susceptible: 0,
    resistant: 0,
    recruited: 0,
    rewires: 0,
  };
  const entryRate = 0.18 + parameters.entry * 0.9;
  const deathRate = 0.002 + parameters.turnover * 0.012;
  const recruitmentRate = 0.025 + parameters.recruitment * 0.2;
  const rewiringRate = parameters.rewiring * 0.58;
  const nonSusceptibleToSusceptibleRate = 0.045;
  const susceptibleToNonSusceptibleRate = 0.018;

  const departing = new Set<number>();
  for (const agent of network.agents) {
    if (network.agents.length - departing.size <= MIN_AGENTS) break;
    if (eventOccurs(deathRate, delta, random)) departing.add(agent.id);
  }
  events.exits = departing.size;
  let agents = network.agents
    .filter((agent) => !departing.has(agent.id))
    .map((agent) => ({ ...agent }));
  let relations = network.relations
    .filter((relation) => !departing.has(relation.source) && !departing.has(relation.target))
    .map((relation) => ({ ...relation }));
  let nextAgentId = network.nextAgentId;
  let nextRelationId = network.nextRelationId;

  if (
    agents.length < MAX_AGENTS &&
    eventOccurs(entryRate, delta, random)
  ) {
    const anchor = selectRandom(agents, random);
    const entrant = makeAgent(
      nextAgentId,
      "N",
      Math.max(...agents.map((agent) => agent.x), 1),
      Math.max(...agents.map((agent) => agent.y), 1),
      time,
      random,
      anchor ?? undefined,
    );
    nextAgentId += 1;
    agents.push(entrant);
    const attachments = agents
      .filter((agent) => agent.id !== entrant.id)
      .sort(() => random() - 0.5)
      .slice(0, ENTRY_DEGREE);
    for (const target of attachments) {
      relations.push({
        id: nextRelationId,
        source: entrant.id,
        target: target.id,
        bornAt: time,
        changedAt: time,
      });
      nextRelationId += 1;
    }
    events.entries += 1;
  }

  const neighboursBeforeStates = neighbourMap(relations);
  const agentsByIdBeforeStates = new Map(agents.map((agent) => [agent.id, agent]));
  agents = agents.map((agent) => {
    if (agent.state === "N") {
      if (!eventOccurs(nonSusceptibleToSusceptibleRate, delta, random)) return agent;
      events.susceptible += 1;
      return { ...agent, state: "S" };
    }
    if (agent.state === "S") {
      if (eventOccurs(susceptibleToNonSusceptibleRate, delta, random)) {
        events.resistant += 1;
        return { ...agent, state: "N" };
      }
      const recruiterNeighbours = countRecruiterNeighbours(
        agent.id,
        agentsByIdBeforeStates,
        neighboursBeforeStates,
      );
      if (!eventOccurs(recruitmentRate * recruiterNeighbours, delta, random)) return agent;
      events.recruited += 1;
      return { ...agent, state: "R" };
    }
    return agent;
  });

  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  const neighboursAfterStates = neighbourMap(relations);
  const relationKeys = new Set<string>();
  const rewiredRelations: RecruitmentRelation[] = [];
  for (const relation of relations) {
    const source = agentsById.get(relation.source);
    const target = agentsById.get(relation.target);
    if (!source || !target) continue;
    const recruiter = source.state === "R"
      ? source
      : target.state === "R"
        ? target
        : null;
    const nonSusceptible = source.state === "N"
      ? source
      : target.state === "N"
        ? target
        : null;
    if (!recruiter || !nonSusceptible || !eventOccurs(rewiringRate, delta, random)) {
      relationKeys.add(relationKey(relation.source, relation.target));
      rewiredRelations.push(relation);
      continue;
    }
    const connected = new Set(neighboursAfterStates.get(recruiter.id) ?? []);
    connected.add(recruiter.id);
    const candidates = agents.filter((agent) =>
      agent.state === "S" && !connected.has(agent.id),
    );
    const replacement = selectRandom(candidates, random);
    if (!replacement) {
      relationKeys.add(relationKey(relation.source, relation.target));
      rewiredRelations.push(relation);
      continue;
    }
    const key = relationKey(recruiter.id, replacement.id);
    if (relationKeys.has(key)) {
      relationKeys.add(relationKey(relation.source, relation.target));
      rewiredRelations.push(relation);
      continue;
    }
    relationKeys.add(key);
    rewiredRelations.push({
      ...relation,
      source: recruiter.id,
      target: replacement.id,
      changedAt: time,
    });
    events.rewires += 1;
  }

  return {
    network: {
      agents,
      relations: rewiredRelations,
      randomState,
      time,
      nextAgentId,
      nextRelationId,
    },
    events,
  };
}

export function introduceSusceptibility(
  network: OpenAdaptiveNetwork,
  point: Point,
  radius = 112,
): OpenAdaptiveNetwork {
  return {
    ...network,
    agents: network.agents.map((agent) => {
      if (agent.state !== "N" || Math.hypot(agent.x - point.x, agent.y - point.y) > radius) {
        return agent;
      }
      return { ...agent, state: "S" };
    }),
  };
}
