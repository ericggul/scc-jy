export type GridState = "inactive" | "N" | "S" | "R";

export type GridSite = {
  readonly id: number;
  readonly row: number;
  readonly column: number;
  state: GridState;
  changedAt: number;
};

export type GridRelation = {
  readonly id: number;
  source: number;
  target: number;
  bornAt: number;
  changedAt: number;
};

export type GridAdaptiveNetwork = {
  readonly dimension: number;
  sites: readonly GridSite[];
  relations: readonly GridRelation[];
  time: number;
  randomState: number;
  nextRelationId: number;
};

export type GridCoevolutionParameters = {
  recruitment: number;
  rewiring: number;
  activation: number;
  turnover: number;
};

export type GridCoevolutionEvents = {
  activated: number;
  deactivated: number;
  susceptible: number;
  resistant: number;
  recruited: number;
  rewired: number;
  tiesBorn: number;
  tiesLost: number;
};

export type GridCoevolutionStep = {
  network: GridAdaptiveNetwork;
  events: GridCoevolutionEvents;
};

export type GridCoevolutionMeasure = {
  active: number;
  inactive: number;
  nonSusceptible: number;
  susceptible: number;
  recruiters: number;
  relations: number;
  components: number;
};

export const DEFAULT_GRID_DIMENSION = 32;

export const DEFAULT_GRID_PARAMETERS: GridCoevolutionParameters = {
  recruitment: 0.64,
  rewiring: 0.7,
  activation: 0.4,
  turnover: 0.52,
};

const MIN_DIMENSION = 16;
const MAX_DIMENSION = 50;
// The default 32 × 32 lattice starts with exactly 648 active sites: three
// times the previous 216-site configuration. Other lattice sizes retain that
// same seeded density rather than receiving a fixed count.
const DEFAULT_INITIAL_ACTIVE_COUNT = 648;
const INITIAL_TIES_PER_VERTEX = 5;
const MIN_ACTIVE = 18;
const ENTRY_DEGREE = 3;

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

function eventOccurs(rate: number, delta: number, random: () => number) {
  return random() < 1 - Math.exp(-Math.max(0, rate) * delta);
}

function siteDistance(first: GridSite, second: GridSite) {
  return Math.hypot(first.row - second.row, first.column - second.column);
}

function chooseWeighted<T>(
  choices: readonly T[],
  weights: readonly number[],
  random: () => number,
) {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0 || choices.length === 0) return null;
  let cursor = random() * total;
  for (let index = 0; index < choices.length; index += 1) {
    cursor -= Math.max(0, weights[index] ?? 0);
    if (cursor <= 0) return choices[index] ?? null;
  }
  return choices[choices.length - 1] ?? null;
}

function neighbourMap(relations: readonly GridRelation[]) {
  const neighbours = new Map<number, number[]>();
  for (const relation of relations) {
    neighbours.set(relation.source, [...(neighbours.get(relation.source) ?? []), relation.target]);
    neighbours.set(relation.target, [...(neighbours.get(relation.target) ?? []), relation.source]);
  }
  return neighbours;
}

function countComponents(sites: readonly GridSite[], relations: readonly GridRelation[]) {
  const neighbours = neighbourMap(relations);
  const seen = new Set<number>();
  let components = 0;
  for (const site of sites) {
    if (site.state === "inactive" || seen.has(site.id)) continue;
    components += 1;
    const pending = [site.id];
    seen.add(site.id);
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

function nearestAttachable(
  source: GridSite,
  candidates: readonly GridSite[],
  connected: ReadonlySet<number>,
  random: () => number,
) {
  const reachable = candidates.filter((candidate) => candidate.id !== source.id && !connected.has(candidate.id));
  const choices = reachable.length > 0 ? reachable : candidates.filter((candidate) => candidate.id !== source.id);
  return chooseWeighted(
    choices,
    choices.map((candidate) => 1 / (1 + siteDistance(source, candidate)) ** 1.7),
    random,
  );
}

function activeState(random: () => number): Exclude<GridState, "inactive"> {
  const value = random();
  if (value < 0.1) return "R";
  if (value < 0.29) return "S";
  return "N";
}

export function createGridAdaptiveNetwork(
  requestedDimension = DEFAULT_GRID_DIMENSION,
  seed = 0x3764d1a9,
): GridAdaptiveNetwork {
  const dimension = clamp(Math.round(requestedDimension), MIN_DIMENSION, MAX_DIMENSION);
  let randomState = seed >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const sites: GridSite[] = [];
  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      sites.push({
        id: row * dimension + column + 1,
        row,
        column,
        state: "inactive",
        changedAt: -5,
      });
    }
  }
  const initialActiveCount = Math.max(
    MIN_ACTIVE,
    Math.round((sites.length * DEFAULT_INITIAL_ACTIVE_COUNT) / (DEFAULT_GRID_DIMENSION ** 2)),
  );
  const candidateIndexes = sites.map((_, index) => index);
  for (let index = 0; index < initialActiveCount; index += 1) {
    const swapIndex = index + Math.floor(random() * (candidateIndexes.length - index));
    const selectedIndex = candidateIndexes[swapIndex];
    const displacedIndex = candidateIndexes[index];
    if (selectedIndex === undefined || displacedIndex === undefined) break;
    candidateIndexes[index] = selectedIndex;
    candidateIndexes[swapIndex] = displacedIndex;
    const candidate = sites[selectedIndex];
    if (!candidate) break;
    candidate.state = activeState(random);
  }
  const active = sites.filter((site) => site.state !== "inactive");
  const relations: GridRelation[] = [];
  const keys = new Set<string>();
  const addRelation = (source: number, target: number) => {
    const key = relationKey(source, target);
    if (source === target || keys.has(key)) return false;
    keys.add(key);
    relations.push({ id: relations.length + 1, source, target, bornAt: 0, changedAt: -5 });
    return true;
  };
  for (const source of active) {
    const neighbours = active
      .filter((candidate) => candidate.id !== source.id)
      .sort((left, right) => siteDistance(source, left) - siteDistance(source, right))
      .slice(0, INITIAL_TIES_PER_VERTEX * 4);
    const connected = new Set<number>([source.id]);
    for (let attachment = 0; attachment < INITIAL_TIES_PER_VERTEX; attachment += 1) {
      const candidates = neighbours.filter((candidate) =>
        !connected.has(candidate.id) && !keys.has(relationKey(source.id, candidate.id)));
      const target = chooseWeighted(
        candidates,
        candidates.map((candidate) => 1 / (1 + siteDistance(source, candidate)) ** 1.35),
        random,
      );
      if (!target) break;
      connected.add(target.id);
      addRelation(source.id, target.id);
    }
  }
  return {
    dimension,
    sites,
    relations,
    time: 0,
    randomState,
    nextRelationId: relations.length + 1,
  };
}

export function measureGridCoevolution(network: GridAdaptiveNetwork): GridCoevolutionMeasure {
  let active = 0;
  let nonSusceptible = 0;
  let susceptible = 0;
  let recruiters = 0;
  for (const site of network.sites) {
    if (site.state === "inactive") continue;
    active += 1;
    if (site.state === "N") nonSusceptible += 1;
    if (site.state === "S") susceptible += 1;
    if (site.state === "R") recruiters += 1;
  }
  return {
    active,
    inactive: network.sites.length - active,
    nonSusceptible,
    susceptible,
    recruiters,
    relations: network.relations.length,
    components: countComponents(network.sites, network.relations),
  };
}

export function stepGridAdaptiveNetwork(
  network: GridAdaptiveNetwork,
  deltaSeconds: number,
  parameters: GridCoevolutionParameters,
): GridCoevolutionStep {
  const delta = clamp(deltaSeconds, 0, 0.05);
  const time = network.time + delta;
  let randomState = network.randomState;
  const random = () => {
    const [value, next] = nextRandom(randomState);
    randomState = next;
    return value;
  };
  const events: GridCoevolutionEvents = {
    activated: 0,
    deactivated: 0,
    susceptible: 0,
    resistant: 0,
    recruited: 0,
    rewired: 0,
    tiesBorn: 0,
    tiesLost: 0,
  };
  // Per-site continuous-time hazards: each eligible grid site can change in
  // this interval, rather than allowing only one global entrant per frame.
  const departureHazard = 0.006 + parameters.turnover * 0.008;
  const entryHazard = 0.006 + parameters.activation * 0.028;
  const recruitmentRate = 0.025 + parameters.recruitment * 0.19;
  const rewiringRate = parameters.rewiring * 0.56;
  const relationDecayRate = 0.002 + parameters.turnover * 0.014;
  let sites = network.sites.map((site) => ({ ...site }));
  const departing = new Set<number>();
  let activeCount = sites.filter((site) => site.state !== "inactive").length;
  for (const site of sites) {
    if (site.state === "inactive" || activeCount <= MIN_ACTIVE) continue;
    if (!eventOccurs(departureHazard, delta, random)) continue;
    departing.add(site.id);
    activeCount -= 1;
  }
  if (departing.size > 0) {
    sites = sites.map((site) => departing.has(site.id)
      ? { ...site, state: "inactive" as const, changedAt: time }
      : site);
    events.deactivated += departing.size;
  }
  let relations = network.relations
    .filter((relation) => !departing.has(relation.source) && !departing.has(relation.target))
    .map((relation) => ({ ...relation }));

  const entrants = new Set<number>();
  sites = sites.map((site) => {
    if (site.state !== "inactive" || !eventOccurs(entryHazard, delta, random)) return site;
    entrants.add(site.id);
    events.activated += 1;
    return { ...site, state: "N" as const, changedAt: time };
  });

  const sitesBeforeState = new Map(sites.map((site) => [site.id, site]));
  const neighboursBeforeState = neighbourMap(relations);
  sites = sites.map((site) => {
    if (site.state === "inactive" || site.state === "R") return site;
    if (site.state === "N") {
      if (!eventOccurs(0.042, delta, random)) return site;
      events.susceptible += 1;
      return { ...site, state: "S" as const, changedAt: time };
    }
    if (eventOccurs(0.015, delta, random)) {
      events.resistant += 1;
      return { ...site, state: "N" as const, changedAt: time };
    }
    const recruiterNeighbours = (neighboursBeforeState.get(site.id) ?? []).reduce((count, id) =>
      count + (sitesBeforeState.get(id)?.state === "R" ? 1 : 0), 0);
    if (!eventOccurs(recruitmentRate * recruiterNeighbours, delta, random)) return site;
    events.recruited += 1;
    return { ...site, state: "R" as const, changedAt: time };
  });

  const sitesById = new Map(sites.map((site) => [site.id, site]));
  const activeSites = sites.filter((site) => site.state !== "inactive");
  const originalNeighbours = neighbourMap(relations);
  const relationKeys = new Set(relations.map((relation) => relationKey(relation.source, relation.target)));
  const nextRelations: GridRelation[] = [];
  for (const relation of relations) {
    relationKeys.delete(relationKey(relation.source, relation.target));
    const source = sitesById.get(relation.source);
    const target = sitesById.get(relation.target);
    if (!source || !target || source.state === "inactive" || target.state === "inactive") continue;
    const recruiter = source.state === "R" ? source : target.state === "R" ? target : null;
    const nonSusceptible = source.state === "N" ? source : target.state === "N" ? target : null;
    if (recruiter && nonSusceptible && eventOccurs(rewiringRate, delta, random)) {
      const connected = new Set(originalNeighbours.get(recruiter.id) ?? []);
      connected.add(recruiter.id);
      const candidates = activeSites.filter((site) => site.state === "S" && !connected.has(site.id));
      const replacement = nearestAttachable(recruiter, candidates, connected, random);
      if (replacement && !relationKeys.has(relationKey(recruiter.id, replacement.id))) {
        relationKeys.add(relationKey(recruiter.id, replacement.id));
        nextRelations.push({
          ...relation,
          source: recruiter.id,
          target: replacement.id,
          changedAt: time,
        });
        events.rewired += 1;
        continue;
      }
    }
    if (eventOccurs(relationDecayRate, delta, random)) {
      events.tiesLost += 1;
      continue;
    }
    relationKeys.add(relationKey(relation.source, relation.target));
    nextRelations.push(relation);
  }
  relations = nextRelations;
  let nextRelationId = network.nextRelationId;
  const currentNeighbours = neighbourMap(relations);

  for (const entrantId of entrants) {
    const entrant = sitesById.get(entrantId);
    if (!entrant || entrant.state === "inactive") continue;
    const connected = new Set<number>([entrant.id]);
    for (let attachment = 0; attachment < ENTRY_DEGREE; attachment += 1) {
      const target = nearestAttachable(entrant, activeSites, connected, random);
      if (!target || relationKeys.has(relationKey(entrant.id, target.id))) continue;
      relationKeys.add(relationKey(entrant.id, target.id));
      connected.add(target.id);
      relations.push({
        id: nextRelationId,
        source: entrant.id,
        target: target.id,
        bornAt: time,
        changedAt: time,
      });
      nextRelationId += 1;
      events.tiesBorn += 1;
    }
  }

  const formationRate = 0.08 + parameters.activation * 0.72;
  if (eventOccurs(formationRate, delta, random)) {
    const sources = activeSites.filter((site) =>
      (site.state === "S" || site.state === "R") &&
      (currentNeighbours.get(site.id) ?? []).length < 7,
    );
    const source = chooseWeighted(
      sources,
      sources.map((site) => site.state === "R" ? 1.4 : 1),
      random,
    );
    if (source) {
      const connected = new Set(currentNeighbours.get(source.id) ?? []);
      connected.add(source.id);
      const target = nearestAttachable(source, activeSites, connected, random);
      if (target && !relationKeys.has(relationKey(source.id, target.id))) {
        relationKeys.add(relationKey(source.id, target.id));
        relations.push({
          id: nextRelationId,
          source: source.id,
          target: target.id,
          bornAt: time,
          changedAt: time,
        });
        nextRelationId += 1;
        events.tiesBorn += 1;
      }
    }
  }

  return {
    network: {
      dimension: network.dimension,
      sites,
      relations,
      time,
      randomState,
      nextRelationId,
    },
    events,
  };
}

export function introduceGridSusceptibility(
  network: GridAdaptiveNetwork,
  row: number,
  column: number,
): GridAdaptiveNetwork {
  const targetId = row * network.dimension + column + 1;
  return {
    ...network,
    sites: network.sites.map((site) => {
      if (site.id !== targetId || site.state === "R") return site;
      return {
        ...site,
        state: site.state === "inactive" ? "S" as const : "S" as const,
        changedAt: network.time,
      };
    }),
  };
}
