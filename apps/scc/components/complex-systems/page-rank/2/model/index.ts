export type PagePosition = {
  x: number;
  y: number;
};

export type PageNode = {
  id: number;
  position: PagePosition;
};

export type PageLink = {
  id: string;
  source: number;
  target: number;
};

export type PageRankNetwork = {
  nodes: PageNode[];
  links: PageLink[];
};

export type RankMethod = "diffusion" | "random-surfer";

export type RandomSurfer = {
  id: number;
  currentPage: number;
  previousPage: number;
  colour: number;
};

export type RetiringLink = PageLink & {
  retiredAt: number;
};

export const LINK_TRANSITION_STEPS = 14;

export type PageRankState = {
  ranks: number[];
  visits: number[];
  totalVisits: number;
  walkers: number[];
  surfers: RandomSurfer[];
  linkColours: Record<string, number>;
  linkTravellerIds: Record<string, number>;
  /** Recent actual flow through each directed link; this never changes rank directly. */
  edgeSignal: Record<string, number>;
  /** Only rewired links are recorded; the initial graph is treated as mature. */
  edgeBirth: Record<string, number>;
  /** A recently removed relation remains available long enough to be seen leaving. */
  retiringLinks: RetiringLink[];
  iteration: number;
  residual: number;
  randomState: number;
};

export type AdaptiveLinkOptions = {
  changes?: number;
  exploration?: number;
};

export type AdaptiveLinkResult = {
  network: PageRankNetwork;
  state: PageRankState;
  replacements: number;
};

export type PageRankMetrics = {
  totalRank: number;
  maximumRank: number;
  maximumPage: number;
  totalVisits: number;
  danglingPages: number;
};

export type SpringLayoutOptions = {
  springLengthMultiplier?: number;
  repulsion?: number;
};

function link(source: number, target: number): PageLink {
  return { id: `${source}-${target}`, source, target };
}

function pages(count: number): PageNode[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    position: { x: 0.5, y: 0.5 },
  }));
}

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomChoice<T>(items: readonly T[], randomState: number): readonly [T, number] {
  const [noise, nextState] = nextRandom(randomState);
  return [items[Math.min(items.length - 1, Math.floor(noise * items.length))]!, nextState];
}

function weightedChoice<T>(
  items: readonly T[],
  weights: readonly number[],
  randomState: number,
): readonly [T, number] {
  const [noise, nextState] = nextRandom(randomState);
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return [items[Math.min(items.length - 1, Math.floor(noise * items.length))]!, nextState];
  let threshold = noise * total;
  for (let index = 0; index < items.length; index += 1) {
    threshold -= Math.max(0, weights[index] ?? 0);
    if (threshold <= 0) return [items[index]!, nextState];
  }
  return [items[items.length - 1]!, nextState];
}

function seededPositions(nodeCount: number, seed: number) {
  const positions: PageNode[] = [];
  let randomState = seed;
  for (let id = 0; id < nodeCount; id += 1) {
    const [jitterX, stateAfterX] = nextRandom(randomState);
    const [jitterY, stateAfterY] = nextRandom(stateAfterX);
    randomState = stateAfterY;
    positions.push({
      id,
      position: {
        x: (jitterX - 0.5) * 32,
        y: (jitterY - 0.5) * 32,
      },
    });
  }
  return positions;
}

function normalizeLayout(nodes: PageNode[]) {
  const centerX = nodes.reduce((total, node) => total + node.position.x, 0) / nodes.length;
  const centerY = nodes.reduce((total, node) => total + node.position.y, 0) / nodes.length;
  const extentX = Math.max(1, ...nodes.map((node) => Math.abs(node.position.x - centerX)));
  const extentY = Math.max(1, ...nodes.map((node) => Math.abs(node.position.y - centerY)));
  return nodes.map((node) => ({
    ...node,
    position: {
      x: 0.5 + ((node.position.x - centerX) / extentX) * 0.44,
      y: 0.5 + ((node.position.y - centerY) / extentY) * 0.44,
    },
  }));
}

/** A browser implementation of NetLogo's layout-spring parameters: 0.2, 20 / sqrt(n), 0.5. */
export function settleNetwork(
  network: PageRankNetwork,
  seed = 0x9e3779b9,
  iterations = 300,
  options: SpringLayoutOptions = {},
): PageRankNetwork {
  const nodes = seededPositions(network.nodes.length, seed);
  const velocity = nodes.map(() => ({ x: 0, y: 0 }));
  const springLength = (20 / Math.sqrt(nodes.length)) * (options.springLengthMultiplier ?? 1);
  const repulsionStrength = options.repulsion ?? 0.5;

  for (let step = 0; step < iterations; step += 1) {
    const force = nodes.map(() => ({ x: 0, y: 0 }));
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const one = nodes[first]!;
        const two = nodes[second]!;
        const dx = two.position.x - one.position.x;
        const dy = two.position.y - one.position.y;
        const distanceSquared = Math.max(0.0001, dx * dx + dy * dy);
        const distance = Math.sqrt(distanceSquared);
        const repulsion = repulsionStrength / distanceSquared;
        const pushX = (dx / distance) * repulsion;
        const pushY = (dy / distance) * repulsion;
        force[first]!.x -= pushX;
        force[first]!.y -= pushY;
        force[second]!.x += pushX;
        force[second]!.y += pushY;
      }
    }
    for (const current of network.links) {
      const source = nodes[current.source];
      const target = nodes[current.target];
      if (!source || !target) continue;
      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const distance = Math.max(0.0001, Math.hypot(dx, dy));
      const spring = Math.max(-1.5, Math.min(1.5, (distance - springLength) * 0.2));
      const pullX = (dx / distance) * spring;
      const pullY = (dy / distance) * spring;
      force[current.source]!.x += pullX;
      force[current.source]!.y += pullY;
      force[current.target]!.x -= pullX;
      force[current.target]!.y -= pullY;
    }
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]!;
      const nodeVelocity = velocity[index]!;
      nodeVelocity.x = (nodeVelocity.x + force[index]!.x * 0.045) * 0.83;
      nodeVelocity.y = (nodeVelocity.y + force[index]!.y * 0.045) * 0.83;
      node.position.x += nodeVelocity.x;
      node.position.y += nodeVelocity.y;
    }
  }
  return { ...network, nodes: normalizeLayout(nodes) };
}

function createPreferentialTopology(
  nodeCount: number,
  linksPerNewPage: number,
  seed = 0x9e3779b9,
): PageRankNetwork {
  const safeCount = Math.max(3, Math.round(nodeCount));
  const safeLinks = Math.max(1, Math.min(Math.round(linksPerNewPage), safeCount - 1));
  const nodes = pages(safeCount);
  const links: PageLink[] = [];
  const pairIds = new Set<string>();
  const degreePool = Array.from({ length: safeLinks }, (_, page) => page);
  let randomState = seed ^ 0x51f15e;
  const firstNewPage = safeLinks;

  // This follows the NetLogo seed: page k connects once to each preceding
  // page, then receives k entries in the preference pool.
  for (const neighbor of degreePool) {
    const [orientation, nextState] = nextRandom(randomState);
    randomState = nextState;
    const source = orientation < 0.5 ? firstNewPage : neighbor;
    const target = orientation < 0.5 ? neighbor : firstNewPage;
    links.push(link(source, target));
    pairIds.add(`${source}-${target}`);
  }
  degreePool.unshift(...Array.from({ length: safeLinks }, () => firstNewPage));

  for (let page = firstNewPage + 1; page < safeCount; page += 1) {
    const selected = new Set<number>();
    const candidates = [...degreePool];
    while (selected.size < safeLinks && candidates.length > 0) {
      const [candidate, nextState] = randomChoice(candidates, randomState);
      randomState = nextState;
      selected.add(candidate);
      for (let index = candidates.length - 1; index >= 0; index -= 1) {
        if (candidates[index] === candidate) candidates.splice(index, 1);
      }
    }
    for (const neighbor of selected) {
      const [orientation, nextState] = nextRandom(randomState);
      randomState = nextState;
      const source = orientation < 0.5 ? page : neighbor;
      const target = orientation < 0.5 ? neighbor : page;
      const id = `${source}-${target}`;
      if (pairIds.has(id)) continue;
      links.push(link(source, target));
      pairIds.add(id);
      degreePool.unshift(neighbor);
    }
    degreePool.unshift(...Array.from({ length: safeLinks }, () => page));
  }

  return { nodes, links };
}

/**
 * A directed Barabási–Albert-style graph. Targets are sampled in proportion
 * to the current total degree, while the direction of each new edge is a
 * separate seeded choice, as in NetLogo's preferential attachment example.
 */
export function createPreferentialNetwork(
  nodeCount: number,
  linksPerNewPage: number,
  seed = 0x9e3779b9,
): PageRankNetwork {
  const topology = createPreferentialTopology(nodeCount, linksPerNewPage, seed);
  const backbone = linksPerNewPage > 2
    ? createPreferentialTopology(nodeCount, 2, seed)
    : topology;
  return { ...topology, nodes: settleNetwork(backbone, seed).nodes };
}

export function createExpandedNetwork(
  nodeCount: number,
  linksPerNewPage: number,
  seed = 0x9e3779b9,
): PageRankNetwork {
  const topology = createPreferentialTopology(nodeCount, linksPerNewPage, seed);
  const backbone = linksPerNewPage > 3
    ? createPreferentialTopology(nodeCount, 3, seed)
    : topology;
  return {
    ...topology,
    nodes: settleNetwork(
      backbone,
    seed,
    300,
    { springLengthMultiplier: 1.35, repulsion: 0.8 },
    ).nodes,
  };
}

export function createNetwork(
  options: { nodeCount?: number; linksPerNewPage?: number; seed?: number } = {},
): PageRankNetwork {
  return createPreferentialNetwork(
    options.nodeCount ?? 150,
    options.linksPerNewPage ?? 5,
    options.seed,
  );
}

export function outgoingLinks(network: PageRankNetwork, pageId: number) {
  return network.links.filter((current) => current.source === pageId);
}

export function incomingLinks(network: PageRankNetwork, pageId: number) {
  return network.links.filter((current) => current.target === pageId);
}

const idsByNodes = new WeakMap<PageNode[], number[]>();

function pageIds(network: PageRankNetwork) {
  const cached = idsByNodes.get(network.nodes);
  if (cached) return cached;
  const ids = network.nodes.map((node) => node.id);
  idsByNodes.set(network.nodes, ids);
  return ids;
}

const outgoingByLinks = new WeakMap<PageLink[], Map<number, PageLink[]>>();

function outgoingByPage(network: PageRankNetwork) {
  const cached = outgoingByLinks.get(network.links);
  if (cached) return cached;
  const outgoing = new Map<number, PageLink[]>();
  for (const node of network.nodes) outgoing.set(node.id, []);
  for (const current of network.links) outgoing.get(current.source)?.push(current);
  outgoingByLinks.set(network.links, outgoing);
  return outgoing;
}

export function createPageRankState(
  network: PageRankNetwork,
  walkerCount = 480,
  seed = 0x5f3759df,
): PageRankState {
  const nodeCount = network.nodes.length;
  const ranks = Array.from({ length: nodeCount }, () => 1 / nodeCount);
  const visits = Array.from({ length: nodeCount }, () => 0);
  const walkers: number[] = [];
  const surfers: RandomSurfer[] = [];
  const ids = pageIds(network);
  let randomState = seed;
  for (let index = 0; index < walkerCount; index += 1) {
    const [page, nextState] = randomChoice(ids, randomState);
    const [colour, afterColour] = randomChoice(Array.from({ length: 12 }, (_, value) => value), nextState);
    walkers.push(page);
    surfers.push({ id: index, currentPage: page, previousPage: page, colour });
    randomState = afterColour;
  }
  return {
    ranks,
    visits,
    totalVisits: 0,
    walkers,
    surfers,
    linkColours: {},
    linkTravellerIds: {},
    edgeSignal: {},
    edgeBirth: {},
    retiringLinks: [],
    iteration: 0,
    residual: 1,
    randomState,
  };
}

function totalVariation(first: readonly number[], second: readonly number[]) {
  return first.reduce((total, value, index) => total + Math.abs(value - (second[index] ?? 0)), 0) / 2;
}

function decayEdgeSignals(network: PageRankNetwork, state: PageRankState) {
  const next: Record<string, number> = {};
  for (const current of network.links) {
    const decayed = (state.edgeSignal[current.id] ?? 0) * 0.92;
    if (decayed > 0.00001) next[current.id] = decayed;
  }
  return next;
}

function currentRetiringLinks(state: PageRankState, nextIteration: number) {
  return state.retiringLinks.filter((current) => (
    nextIteration - current.retiredAt < LINK_TRANSITION_STEPS
  ));
}

export function stepDiffusion(
  network: PageRankNetwork,
  state: PageRankState,
  dampingFactor: number,
): PageRankState {
  const nodeCount = network.nodes.length;
  const outgoing = outgoingByPage(network);
  const nextRanks = Array.from({ length: nodeCount }, () => 0);
  const edgeSignal = decayEdgeSignals(network, state);
  let danglingRank = 0;

  for (const page of network.nodes) {
    const currentRank = state.ranks[page.id] ?? 0;
    const links = outgoing.get(page.id) ?? [];
    if (links.length === 0) {
      danglingRank += currentRank;
      continue;
    }
    const increment = (dampingFactor * currentRank) / links.length;
    for (const currentLink of links) {
      nextRanks[currentLink.target] = (nextRanks[currentLink.target] ?? 0) + increment;
      edgeSignal[currentLink.id] = (edgeSignal[currentLink.id] ?? 0) + increment;
    }
  }

  const universalIncrement = (1 - dampingFactor) / nodeCount + (dampingFactor * danglingRank) / nodeCount;
  for (let page = 0; page < nodeCount; page += 1) {
    nextRanks[page] = (nextRanks[page] ?? 0) + universalIncrement;
  }

  return {
    ...state,
    ranks: nextRanks,
    linkColours: {},
    linkTravellerIds: {},
    edgeSignal,
    retiringLinks: currentRetiringLinks(state, state.iteration + 1),
    iteration: state.iteration + 1,
    residual: totalVariation(state.ranks, nextRanks),
  };
}

export function resizeWalkerEnsemble(
  network: PageRankNetwork,
  state: PageRankState,
  walkerCount: number,
): PageRankState {
  const targetCount = Math.max(1, Math.round(walkerCount));
  if (state.walkers.length === targetCount) return state;
  const walkers = state.walkers.slice(0, targetCount);
  const surfers = state.surfers.slice(0, targetCount);
  const ids = pageIds(network);
  let randomState = state.randomState;
  while (walkers.length < targetCount) {
    const [page, nextState] = randomChoice(ids, randomState);
    const [colour, afterColour] = randomChoice(Array.from({ length: 12 }, (_, value) => value), nextState);
    walkers.push(page);
    surfers.push({
      id: surfers.length,
      currentPage: page,
      previousPage: page,
      colour,
    });
    randomState = afterColour;
  }
  return { ...state, walkers, surfers, randomState };
}

export function stepRandomSurfer(
  network: PageRankNetwork,
  state: PageRankState,
  dampingFactor: number,
): PageRankState {
  // A short memory lets page influence rise and fall with a changing network
  // instead of freezing into an all-time visit average.
  const visits = state.visits.map((count) => count * 0.95);
  const linkColours: Record<string, number> = {};
  const linkTravellerIds: Record<string, number> = {};
  const walkers: number[] = [];
  const surfers: RandomSurfer[] = [];
  const outgoing = outgoingByPage(network);
  const ids = pageIds(network);
  const edgeSignal = decayEdgeSignals(network, state);
  let randomState = state.randomState;
  for (let index = 0; index < state.walkers.length; index += 1) {
    const currentPage = state.walkers[index]!;
    const surfer = state.surfers[index] ?? {
      id: index,
      currentPage,
      previousPage: currentPage,
      colour: index % 12,
    };
    visits[currentPage] = (visits[currentPage] ?? 0) + 1;
    const possibleLinks = outgoing.get(currentPage) ?? [];
    const [moveNoise, afterMoveNoise] = nextRandom(randomState);
    randomState = afterMoveNoise;
    if (moveNoise <= dampingFactor && possibleLinks.length > 0) {
      const [nextLink, nextState] = randomChoice(possibleLinks, randomState);
      randomState = nextState;
      walkers.push(nextLink.target);
      linkColours[nextLink.id] = surfer.colour;
      linkTravellerIds[nextLink.id] = surfer.id;
      edgeSignal[nextLink.id] = (edgeSignal[nextLink.id] ?? 0) + 1 / state.walkers.length;
      surfers.push({ ...surfer, previousPage: currentPage, currentPage: nextLink.target });
    } else {
      const [nextPage, nextState] = randomChoice(ids, randomState);
      randomState = nextState;
      walkers.push(nextPage);
      surfers.push({ ...surfer, previousPage: currentPage, currentPage: nextPage });
    }
  }
  const totalVisits = visits.reduce((total, count) => total + count, 0);
  const ranks = visits.map((count) => count / Math.max(totalVisits, 1));
  return {
    ...state,
    ranks,
    visits,
    totalVisits: state.totalVisits + state.walkers.length,
    walkers,
    surfers,
    linkColours,
    linkTravellerIds,
    edgeSignal,
    retiringLinks: currentRetiringLinks(state, state.iteration + 1),
    iteration: state.iteration + 1,
    residual: totalVariation(state.ranks, ranks),
    randomState,
  };
}

/**
 * Replaces a small number of weakly used links. PageRank itself stays an
 * ordinary unweighted transition process: traffic history only decides which
 * relationships remain and which destinations are likely to be explored.
 */
export function rewireAdaptiveLinks(
  network: PageRankNetwork,
  state: PageRankState,
  options: AdaptiveLinkOptions = {},
): AdaptiveLinkResult {
  const changes = Math.max(0, Math.round(options.changes ?? 2));
  const exploration = Math.max(0.02, Math.min(0.4, options.exploration ?? 0.12));
  let links = [...network.links];
  const edgeSignal = { ...state.edgeSignal };
  const edgeBirth = { ...state.edgeBirth };
  const linkColours = { ...state.linkColours };
  const linkTravellerIds = { ...state.linkTravellerIds };
  const retiringLinks = currentRetiringLinks(state, state.iteration);
  const ids = pageIds(network);
  const maximumRank = Math.max(0.000001, ...state.ranks);
  let randomState = state.randomState;
  let replacements = 0;

  for (let change = 0; change < changes; change += 1) {
    const targetIdsBySource = new Map<number, Set<number>>();
    const incomingSignal = new Map<number, number>();
    let maximumSignal = 0.000001;
    let maximumIncomingSignal = 0.000001;
    for (const current of links) {
      const targetIds = targetIdsBySource.get(current.source) ?? new Set<number>();
      targetIds.add(current.target);
      targetIdsBySource.set(current.source, targetIds);
      const signal = edgeSignal[current.id] ?? 0;
      maximumSignal = Math.max(maximumSignal, signal);
      const incoming = (incomingSignal.get(current.target) ?? 0) + signal;
      incomingSignal.set(current.target, incoming);
      maximumIncomingSignal = Math.max(maximumIncomingSignal, incoming);
    }

    const removable = links.filter((current) => (
      ids.length - 1 - (targetIdsBySource.get(current.source)?.size ?? 0) > 0
    ));
    if (removable.length === 0) break;

    const [oldLink, stateAfterOldLink] = weightedChoice(
      removable,
      removable.map((current) => {
        const traffic = (edgeSignal[current.id] ?? 0) / maximumSignal;
        const targetRank = (state.ranks[current.target] ?? 0) / maximumRank;
        const bornAt = edgeBirth[current.id];
        const protectedLink = bornAt !== undefined && state.iteration - bornAt < 72;
        const keepScore = 0.14 + traffic * 0.58 + targetRank * 0.28;
        return Math.max(0.004, (1 - keepScore) * (protectedLink ? 0.12 : 1));
      }),
      randomState,
    );
    randomState = stateAfterOldLink;
    const occupiedTargets = targetIdsBySource.get(oldLink.source)!;
    const possibleTargets = ids.filter((candidate) => (
      candidate !== oldLink.source &&
      candidate !== oldLink.target &&
      !occupiedTargets.has(candidate)
    ));
    if (possibleTargets.length === 0) continue;

    const [newTarget, stateAfterNewTarget] = weightedChoice(
      possibleTargets,
      possibleTargets.map((candidate) => {
        const rank = (state.ranks[candidate] ?? 0) / maximumRank;
        const incoming = (incomingSignal.get(candidate) ?? 0) / maximumIncomingSignal;
        return exploration + (1 - exploration) * (rank * 0.55 + incoming * 0.45);
      }),
      randomState,
    );
    randomState = stateAfterNewTarget;
    const newLink = link(oldLink.source, newTarget);
    const index = links.findIndex((current) => current.id === oldLink.id);
    if (index < 0) continue;
    links[index] = newLink;
    delete edgeSignal[oldLink.id];
    delete edgeBirth[oldLink.id];
    delete linkColours[oldLink.id];
    delete linkTravellerIds[oldLink.id];
    edgeSignal[newLink.id] = 0;
    edgeBirth[newLink.id] = state.iteration;
    retiringLinks.push({ ...oldLink, retiredAt: state.iteration });
    replacements += 1;
  }

  return {
    network: { ...network, links },
    state: {
      ...state,
      edgeSignal,
      edgeBirth,
      linkColours,
      linkTravellerIds,
      retiringLinks,
      randomState,
    },
    replacements,
  };
}

export function pageRankMetrics(network: PageRankNetwork, state: PageRankState): PageRankMetrics {
  const totalRank = state.ranks.reduce((total, rank) => total + rank, 0);
  const maximumRank = Math.max(...state.ranks);
  const maximumPage = state.ranks.indexOf(maximumRank);
  return {
    totalRank,
    maximumRank,
    maximumPage,
    totalVisits: state.totalVisits,
    danglingPages: network.nodes.filter((node) => outgoingLinks(network, node.id).length === 0).length,
  };
}

export function movePage(
  network: PageRankNetwork,
  pageId: number,
  position: PagePosition,
): PageRankNetwork {
  return {
    ...network,
    nodes: network.nodes.map((page) => page.id === pageId
      ? { ...page, position: { x: Math.max(0.035, Math.min(0.965, position.x)), y: Math.max(0.05, Math.min(0.95, position.y)) } }
      : page),
  };
}
