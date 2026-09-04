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

export type PageRankState = {
  ranks: number[];
  visits: number[];
  walkers: number[];
  surfers: RandomSurfer[];
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
  return settleNetwork(createPreferentialTopology(nodeCount, linksPerNewPage, seed), seed);
}

export function createExpandedNetwork(
  nodeCount: number,
  linksPerNewPage: number,
  seed = 0x9e3779b9,
): PageRankNetwork {
  return settleNetwork(
    createPreferentialTopology(nodeCount, linksPerNewPage, seed),
    seed,
    300,
    { springLengthMultiplier: 1.35, repulsion: 0.8 },
  );
}

export function createNetwork(
  options: { nodeCount?: number; linksPerNewPage?: number; seed?: number } = {},
): PageRankNetwork {
  return createPreferentialNetwork(
    options.nodeCount ?? 150,
    options.linksPerNewPage ?? 2,
    options.seed,
  );
}

export function outgoingLinks(network: PageRankNetwork, pageId: number) {
  return network.links.filter((current) => current.source === pageId);
}

export function incomingLinks(network: PageRankNetwork, pageId: number) {
  return network.links.filter((current) => current.target === pageId);
}

function pageIds(network: PageRankNetwork) {
  return network.nodes.map((node) => node.id);
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
    walkers,
    surfers,
    linkColours: {},
    iteration: 0,
    residual: 1,
    randomState,
  };
}

function totalVariation(first: readonly number[], second: readonly number[]) {
  return first.reduce((total, value, index) => total + Math.abs(value - (second[index] ?? 0)), 0) / 2;
}

export function stepDiffusion(
  network: PageRankNetwork,
  state: PageRankState,
  dampingFactor: number,
): PageRankState {
  const nodeCount = network.nodes.length;
  const outgoing = outgoingByPage(network);
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
  const visits = [...state.visits];
  const linkColours: Record<string, number> = {};
  const walkers: number[] = [];
  const surfers: RandomSurfer[] = [];
  const outgoing = outgoingByPage(network);
  const ids = pageIds(network);
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
    walkers,
    surfers,
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

export type TerritoryPoint = {
  x: number;
  y: number;
};

export type RankTerritory = {
  pageId: number;
  polygon: TerritoryPoint[];
  centroid: TerritoryPoint;
  area: number;
};

export type RankTerritoryDiagram = {
  width: number;
  height: number;
  territories: RankTerritory[];
};

const POWER_MIN = -1.45;
const POWER_MAX = 1.7;

function clipPolygonAgainstPowerBisector(
  polygon: TerritoryPoint[],
  site: TerritoryPoint,
  sitePower: number,
  otherSite: TerritoryPoint,
  otherPower: number,
) {
  if (polygon.length === 0) return polygon;

  const a = 2 * (otherSite.x - site.x);
  const b = 2 * (otherSite.y - site.y);
  const c = (
    otherSite.x * otherSite.x
    + otherSite.y * otherSite.y
    - site.x * site.x
    - site.y * site.y
    + sitePower
    - otherPower
  );

  if (a * a + b * b < 0.000001) return sitePower < otherPower ? [] : polygon;

  const clipped: TerritoryPoint[] = [];
  let previous = polygon[polygon.length - 1]!;
  let previousDistance = a * previous.x + b * previous.y - c;

  for (const current of polygon) {
    const currentDistance = a * current.x + b * current.y - c;
    const previousInside = previousDistance <= 0.000001;
    const currentInside = currentDistance <= 0.000001;

    if (previousInside !== currentInside) {
      const progress = previousDistance / (previousDistance - currentDistance);
      clipped.push({
        x: previous.x + (current.x - previous.x) * progress,
        y: previous.y + (current.y - previous.y) * progress,
      });
    }
    if (currentInside) clipped.push(current);

    previous = current;
    previousDistance = currentDistance;
  }

  return clipped;
}

function polygonMeasure(polygon: TerritoryPoint[], fallback: TerritoryPoint) {
  if (polygon.length < 3) return { area: 0, centroid: fallback };

  let signedDoubleArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const cross = current.x * next.y - next.x * current.y;
    signedDoubleArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  if (Math.abs(signedDoubleArea) < 0.000001) return { area: 0, centroid: fallback };
  return {
    area: Math.abs(signedDoubleArea) / 2,
    centroid: {
      x: centroidX / (3 * signedDoubleArea),
      y: centroidY / (3 * signedDoubleArea),
    },
  };
}

/**
 * Converts rank into the additive weight of a power diagram:
 * d²(x, page) - weight(page). Higher-ranked pages therefore claim more area
 * while the clipped polygons still partition the entire viewport exactly.
 */
function rankPower(rank: number, averageRank: number, viewportScale: number) {
  const relativeRank = Math.max(rank, averageRank * 0.04) / averageRank;
  const compressed = Math.max(POWER_MIN, Math.min(POWER_MAX, Math.log(relativeRank)));
  return compressed * viewportScale * viewportScale * 0.026;
}

export function createRankTerritoryDiagram(
  network: PageRankNetwork,
  ranks: readonly number[],
  width: number,
  height: number,
): RankTerritoryDiagram {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const averageRank = 1 / Math.max(network.nodes.length, 1);
  const viewportScale = Math.min(safeWidth, safeHeight);
  const sites = network.nodes.map((page) => ({
    pageId: page.id,
    x: Math.max(0, Math.min(1, page.position.x)) * safeWidth,
    y: Math.max(0, Math.min(1, page.position.y)) * safeHeight,
    power: rankPower(ranks[page.id] ?? averageRank, averageRank, viewportScale),
  }));
  const bounds = [
    { x: 0, y: 0 },
    { x: safeWidth, y: 0 },
    { x: safeWidth, y: safeHeight },
    { x: 0, y: safeHeight },
  ];

  const territories = sites.map((site) => {
    let polygon = bounds;
    for (const other of sites) {
      if (other.pageId === site.pageId) continue;
      polygon = clipPolygonAgainstPowerBisector(polygon, site, site.power, other, other.power);
      if (polygon.length === 0) break;
    }
    const measure = polygonMeasure(polygon, site);
    return {
      pageId: site.pageId,
      polygon,
      ...measure,
    };
  });

  return { width: safeWidth, height: safeHeight, territories };
}
