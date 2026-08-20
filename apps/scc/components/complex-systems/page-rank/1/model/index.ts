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

export type NetworkPreset = "example-1" | "example-2" | "preferential";
export type RankMethod = "diffusion" | "random-surfer";

export type RandomSurfer = {
  id: number;
  currentPage: number;
  previousPage: number;
  colour: number;
};

export type PageRankState = {
  ranks: number[];
  visits: number[];
  walkers: number[];
  surfers: RandomSurfer[];
  flux: Record<string, number>;
  linkColours: Record<string, number>;
  iteration: number;
  residual: number;
  randomState: number;
};

export type PageRankMetrics = {
  totalRank: number;
  maximumRank: number;
  maximumPage: number;
  totalVisits: number;
  danglingPages: number;
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
        x: 0.08 + jitterX * 0.84,
        y: 0.08 + jitterY * 0.84,
      },
    });
  }
  return positions;
}

/** A bounded browser equivalent of NetLogo's repeated layout-spring call. */
export function settleNetwork(
  network: PageRankNetwork,
  seed = 0x9e3779b9,
  iterations = 300,
): PageRankNetwork {
  const nodes = seededPositions(network.nodes.length, seed);
  const velocity = nodes.map(() => ({ x: 0, y: 0 }));
  const idealLength = Math.min(0.28, 0.84 / Math.sqrt(nodes.length));

  for (let step = 0; step < iterations; step += 1) {
    const force = nodes.map(() => ({ x: 0, y: 0 }));
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const one = nodes[first]!;
        const two = nodes[second]!;
        const dx = two.position.x - one.position.x;
        const dy = two.position.y - one.position.y;
        const distanceSquared = Math.max(0.00012, dx * dx + dy * dy);
        const distance = Math.sqrt(distanceSquared);
        const repulsion = 0.00082 / distanceSquared;
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
      const spring = (distance - idealLength) * 0.026;
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
      nodeVelocity.x = (nodeVelocity.x + force[index]!.x) * 0.82;
      nodeVelocity.y = (nodeVelocity.y + force[index]!.y) * 0.82;
      node.position.x = Math.max(0.055, Math.min(0.945, node.position.x + nodeVelocity.x));
      node.position.y = Math.max(0.07, Math.min(0.93, node.position.y + nodeVelocity.y));
    }
  }
  return { ...network, nodes };
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

  return settleNetwork({ nodes, links }, seed);
}

export function createNetwork(
  preset: NetworkPreset,
  options: { nodeCount?: number; linksPerNewPage?: number; seed?: number } = {},
): PageRankNetwork {
  if (preset === "preferential") {
    return createPreferentialNetwork(
      options.nodeCount ?? 32,
      options.linksPerNewPage ?? 2,
      options.seed,
    );
  }

  if (preset === "example-1") {
    return settleNetwork({
      nodes: pages(11),
      links: [
        link(3, 0),
        link(2, 1), link(3, 1), link(4, 1), link(5, 1), link(6, 1), link(7, 1), link(8, 1),
        link(1, 2), link(4, 3),
        link(5, 4), link(6, 4), link(7, 4), link(8, 4), link(9, 4), link(10, 4),
        link(4, 5),
      ],
    }, options.seed);
  }

  return settleNetwork({
    nodes: pages(7),
    links: [
      link(1, 0), link(2, 0), link(4, 0), link(5, 0),
      link(0, 1), link(2, 1), link(3, 1),
      link(0, 2), link(3, 2), link(4, 2),
      link(0, 3), link(4, 3),
      link(0, 4), link(3, 4), link(5, 4), link(6, 4),
      link(4, 5), link(0, 6),
    ],
  }, options.seed);
}

export function outgoingLinks(network: PageRankNetwork, pageId: number) {
  return network.links.filter((current) => current.source === pageId);
}

export function incomingLinks(network: PageRankNetwork, pageId: number) {
  return network.links.filter((current) => current.target === pageId);
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
  let randomState = seed;
  for (let index = 0; index < walkerCount; index += 1) {
    const [page, nextState] = randomChoice(network.nodes.map((node) => node.id), randomState);
    const [colour, afterColour] = randomChoice(Array.from({ length: 12 }, (_, value) => value), nextState);
    walkers.push(page);
    surfers.push({ id: index, currentPage: page, previousPage: page, colour });
    randomState = afterColour;
  }
  return {
    ranks,
    visits,
    walkers,
    surfers,
    flux: {},
    linkColours: {},
    iteration: 0,
    residual: 1,
    randomState,
  };
}

function totalVariation(first: readonly number[], second: readonly number[]) {
  return first.reduce((total, value, index) => total + Math.abs(value - (second[index] ?? 0)), 0) / 2;
}

function emptyFlux(network: PageRankNetwork) {
  return Object.fromEntries(network.links.map((current) => [current.id, 0])) as Record<string, number>;
}

export function stepDiffusion(
  network: PageRankNetwork,
  state: PageRankState,
  dampingFactor: number,
): PageRankState {
  const nodeCount = network.nodes.length;
  const outgoing = new Map(network.nodes.map((node) => [node.id, outgoingLinks(network, node.id)]));
  const flux = emptyFlux(network);
  const nextRanks = Array.from({ length: nodeCount }, () => 0);
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
      flux[currentLink.id] = increment;
    }
  }

  const universalIncrement = (1 - dampingFactor) / nodeCount + (dampingFactor * danglingRank) / nodeCount;
  for (let page = 0; page < nodeCount; page += 1) {
    nextRanks[page] = (nextRanks[page] ?? 0) + universalIncrement;
  }

  return {
    ...state,
    ranks: nextRanks,
    flux,
    linkColours: {},
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
  let randomState = state.randomState;
  while (walkers.length < targetCount) {
    const [page, nextState] = randomChoice(network.nodes.map((node) => node.id), randomState);
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
  const visits = [...state.visits];
  const flux = emptyFlux(network);
  const linkColours: Record<string, number> = {};
  const walkers: number[] = [];
  const surfers: RandomSurfer[] = [];
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
    const possibleLinks = outgoingLinks(network, currentPage);
    const [moveNoise, afterMoveNoise] = nextRandom(randomState);
    randomState = afterMoveNoise;
    if (moveNoise <= dampingFactor && possibleLinks.length > 0) {
      const [nextLink, nextState] = randomChoice(possibleLinks, randomState);
      randomState = nextState;
      walkers.push(nextLink.target);
      flux[nextLink.id] = (flux[nextLink.id] ?? 0) + 1 / state.walkers.length;
      linkColours[nextLink.id] = surfer.colour;
      surfers.push({ ...surfer, previousPage: currentPage, currentPage: nextLink.target });
    } else {
      const [nextPage, nextState] = randomChoice(network.nodes.map((node) => node.id), randomState);
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
    walkers,
    surfers,
    flux,
    linkColours,
    iteration: state.iteration + 1,
    residual: totalVariation(state.ranks, ranks),
    randomState,
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
    totalVisits: state.visits.reduce((total, visits) => total + visits, 0),
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
