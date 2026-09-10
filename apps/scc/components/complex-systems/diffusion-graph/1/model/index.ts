export const DEFAULT_GRID_SIZE = 9;
export const DEFAULT_LINK_CHANCE = 50;
export const DEFAULT_DIFFUSION_RATE = 10;

export type DiffusionNode = {
  id: number;
  x: number;
  y: number;
};

export type DirectedLatticeLink = {
  id: string;
  source: number;
  target: number;
};

export type DiffusionGraph = {
  gridSize: number;
  nodes: readonly DiffusionNode[];
  links: readonly DirectedLatticeLink[];
  outgoingLinkIndices: readonly (readonly number[])[];
  activeLinks: Uint8Array;
};

export type DiffusionState = {
  values: Float64Array;
  nextValues: Float64Array;
  flows: Float64Array;
  tick: number;
  randomState: number;
};

export type DiffusionSimulation = {
  graph: DiffusionGraph;
  state: DiffusionState;
};

export type DiffusionMetrics = {
  totalValue: number;
  maximumValue: number;
  activeLinkCount: number;
  maximumFlow: number;
  meanFlow: number;
};

function boundedGridSize(value: number) {
  const rounded = Math.round(value);
  const bounded = Math.max(3, Math.min(19, rounded));
  return bounded % 2 === 0 ? bounded - 1 : bounded;
}

function boundedPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

/** A compact deterministic source for NetLogo-style setup and one-of choices. */
function nextRandom(randomState: number): readonly [number, number] {
  let next = randomState | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

/**
 * Reproduces the NetLogo setup lattice: odd grid sizes from 3 to 19, directed
 * links to each von Neumann neighbour, and a separately stored inactive breed.
 */
export function createDiffusionSimulation(
  options: {
    gridSize?: number;
    linkChance?: number;
    seed?: number;
  } = {},
): DiffusionSimulation {
  const gridSize = boundedGridSize(options.gridSize ?? DEFAULT_GRID_SIZE);
  const linkChance = boundedPercentage(options.linkChance ?? DEFAULT_LINK_CHANCE);
  const halfGrid = (gridSize - 1) / 2;
  const worldScale = 9 / halfGrid;
  const nodes: DiffusionNode[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const id = row * gridSize + column;
      nodes.push({
        id,
        x: (column - halfGrid) * worldScale,
        y: (halfGrid - row) * worldScale,
      });
    }
  }

  const links: DirectedLatticeLink[] = [];
  const outgoingLinkIndices = Array.from({ length: nodes.length }, () => [] as number[]);
  const active: number[] = [];
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;
  let randomState = options.seed ?? 0x6f77b2d1;

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const source = row * gridSize + column;
      for (const [rowOffset, columnOffset] of directions) {
        const nextRow = row + rowOffset;
        const nextColumn = column + columnOffset;
        if (nextRow < 0 || nextRow >= gridSize || nextColumn < 0 || nextColumn >= gridSize) continue;
        const target = nextRow * gridSize + nextColumn;
        const index = links.length;
        links.push({ id: `${source}-${target}`, source, target });
        outgoingLinkIndices[source]?.push(index);
        const [random, nextState] = nextRandom(randomState);
        randomState = nextState;
        // NetLogo uses: if random-float 100 > link-chance [ make inactive ].
        active.push(random * 100 <= linkChance ? 1 : 0);
      }
    }
  }

  const graph: DiffusionGraph = {
    gridSize,
    nodes,
    links,
    outgoingLinkIndices,
    activeLinks: Uint8Array.from(active),
  };
  const initialValues = new Float64Array(nodes.length).fill(1);
  return {
    graph,
    state: {
      values: initialValues,
      nextValues: new Float64Array(nodes.length),
      flows: new Float64Array(links.length),
      tick: 0,
      randomState,
    },
  };
}

/**
 * The NetLogo `go` procedure. Buffers are reused so a tick only touches the
 * fixed-size state arrays; active topology and link flows stay separate.
 */
export function stepDiffusion(
  graph: DiffusionGraph,
  state: DiffusionState,
  diffusionRate: number,
) {
  const share = boundedPercentage(diffusionRate) / 100;
  const values = state.values;
  const nextValues = state.nextValues;
  const flows = state.flows;
  nextValues.fill(0);
  flows.fill(0);

  for (let source = 0; source < graph.nodes.length; source += 1) {
    const outgoing = graph.outgoingLinkIndices[source] ?? [];
    let recipientCount = 0;
    for (const linkIndex of outgoing) {
      recipientCount += graph.activeLinks[linkIndex] ?? 0;
    }

    const value = values[source] ?? 0;
    if (recipientCount === 0) {
      nextValues[source] += value;
      continue;
    }

    const valueToKeep = value * (1 - share);
    const increment = (value - valueToKeep) / recipientCount;
    nextValues[source] += valueToKeep;
    for (const linkIndex of outgoing) {
      if (graph.activeLinks[linkIndex] !== 1) continue;
      const link = graph.links[linkIndex];
      if (!link) continue;
      nextValues[link.target] += increment;
      flows[linkIndex] = increment;
    }
  }

  state.values = nextValues;
  state.nextValues = values;
  state.tick += 1;
  return state;
}

function chooseLinkByActivity(
  graph: DiffusionGraph,
  state: DiffusionState,
  active: 0 | 1,
) {
  let candidateCount = 0;
  for (let index = 0; index < graph.links.length; index += 1) {
    if (graph.activeLinks[index] === active) candidateCount += 1;
  }
  if (candidateCount === 0) return null;
  const [random, nextState] = nextRandom(state.randomState);
  state.randomState = nextState;
  const selected = Math.min(candidateCount - 1, Math.floor(random * candidateCount));
  let seen = 0;
  for (let index = 0; index < graph.links.length; index += 1) {
    if (graph.activeLinks[index] !== active) continue;
    if (seen === selected) return index;
    seen += 1;
  }
  return null;
}

/**
 * NetLogo's `rewire-a-link`: move one active link to the inactive breed, then
 * choose an inactive link (including that just-hidden link) to reactivate.
 */
export function rewireOneLink(graph: DiffusionGraph, state: DiffusionState) {
  const deactivated = chooseLinkByActivity(graph, state, 1);
  if (deactivated === null) return false;
  graph.activeLinks[deactivated] = 0;
  const activated = chooseLinkByActivity(graph, state, 0);
  if (activated !== null) graph.activeLinks[activated] = 1;
  return true;
}

export function diffusionMetrics(graph: DiffusionGraph, state: DiffusionState): DiffusionMetrics {
  let totalValue = 0;
  let maximumValue = 0;
  for (const value of state.values) {
    totalValue += value;
    maximumValue = Math.max(maximumValue, value);
  }

  let activeLinkCount = 0;
  let totalFlow = 0;
  let maximumFlow = 0;
  for (let index = 0; index < graph.links.length; index += 1) {
    if (graph.activeLinks[index] !== 1) continue;
    const flow = state.flows[index] ?? 0;
    activeLinkCount += 1;
    totalFlow += flow;
    maximumFlow = Math.max(maximumFlow, flow);
  }

  return {
    totalValue,
    maximumValue,
    activeLinkCount,
    maximumFlow,
    meanFlow: activeLinkCount > 0 ? totalFlow / activeLinkCount : 0,
  };
}

/** NetLogo: `set size 0.1 + 5 * sqrt (val / total-val)`. */
export function nodeDiameter(value: number, totalValue: number) {
  return 0.1 + 5 * Math.sqrt(Math.max(0, value) / Math.max(totalValue, Number.EPSILON));
}
