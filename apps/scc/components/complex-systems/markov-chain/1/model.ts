export const REGIMES = ["circulate", "cross", "settle"] as const;
export const HEADINGS = ["orbit", "counter", "bridge"] as const;

export type Regime = (typeof REGIMES)[number];
export type Heading = (typeof HEADINGS)[number];

export type Site = {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly well: number;
};

export type DirectedMove = {
  readonly source: string;
  readonly target: string;
  readonly heading: Heading;
  readonly weight: number;
};

export type ChainState = {
  readonly siteId: string;
  readonly regime: Regime;
  readonly heading: Heading;
};

export type Transition = {
  readonly to: number;
  readonly probability: number;
};

export type MarkovChain = {
  readonly states: readonly ChainState[];
  readonly transitions: readonly (readonly Transition[])[];
  readonly stationary: Float64Array;
  readonly stationaryBySite: Float64Array;
  readonly stateIndex: ReadonlyMap<string, number>;
};

export type MarkovSimulation = {
  readonly states: Uint16Array;
  readonly randomState: number;
  readonly step: number;
  readonly witness: readonly number[];
};

export const SITES: readonly Site[] = [
  { id: "a", label: "A", x: -0.78, y: -0.45, well: 0.72 },
  { id: "b", label: "B", x: -0.27, y: -0.78, well: 0.35 },
  { id: "c", label: "C", x: 0.35, y: -0.72, well: 0.48 },
  { id: "d", label: "D", x: 0.82, y: -0.25, well: 0.82 },
  { id: "e", label: "E", x: 0.7, y: 0.48, well: 0.42 },
  { id: "f", label: "F", x: 0.08, y: 0.78, well: 0.68 },
  { id: "g", label: "G", x: -0.57, y: 0.62, well: 0.53 },
  { id: "h", label: "H", x: -0.9, y: 0.08, well: 0.3 },
  { id: "i", label: "I", x: -0.38, y: -0.03, well: 0.88 },
  { id: "j", label: "J", x: -0.03, y: -0.18, well: 0.46 },
  { id: "k", label: "K", x: 0.38, y: 0.08, well: 0.76 },
  { id: "l", label: "L", x: -0.06, y: 0.39, well: 0.6 },
];

const REGIME_TRANSITION: Record<Regime, Record<Regime, number>> = {
  circulate: { circulate: 0.85, cross: 0.11, settle: 0.04 },
  cross: { circulate: 0.14, cross: 0.74, settle: 0.12 },
  settle: { circulate: 0.11, cross: 0.15, settle: 0.74 },
};

const MOVE_AFFINITY: Record<Regime, Record<Heading, number>> = {
  circulate: { orbit: 3.1, counter: 0.32, bridge: 0.52 },
  cross: { orbit: 0.7, counter: 0.45, bridge: 2.65 },
  settle: { orbit: 0.44, counter: 1.38, bridge: 0.82 },
};

const OUTER_RING = ["a", "b", "c", "d", "e", "f", "g", "h"];

function ringMoves(): DirectedMove[] {
  return OUTER_RING.flatMap((source, index) => {
    const target = OUTER_RING[(index + 1) % OUTER_RING.length];
    return [
      { source, target, heading: "orbit" as const, weight: 1.35 },
      { source: target, target: source, heading: "counter" as const, weight: 0.72 },
    ];
  });
}

function bridgeMoves(
  source: string,
  target: string,
  forwardWeight = 1,
  backwardWeight = 0.82,
): DirectedMove[] {
  return [
    { source, target, heading: "bridge", weight: forwardWeight },
    { source: target, target: source, heading: "bridge", weight: backwardWeight },
  ];
}

export const MOVES: readonly DirectedMove[] = [
  ...ringMoves(),
  ...bridgeMoves("a", "i", 0.82, 0.62),
  ...bridgeMoves("h", "i", 1.04, 0.7),
  ...bridgeMoves("b", "j", 0.76, 0.68),
  ...bridgeMoves("i", "j", 1.38, 0.78),
  ...bridgeMoves("j", "k", 1.18, 0.74),
  ...bridgeMoves("c", "k", 0.74, 0.88),
  ...bridgeMoves("d", "k", 1.05, 0.66),
  ...bridgeMoves("i", "l", 0.64, 0.9),
  ...bridgeMoves("l", "k", 0.9, 0.76),
  ...bridgeMoves("l", "f", 1.05, 0.74),
  ...bridgeMoves("l", "g", 0.74, 0.98),
];

const SITE_BY_ID = new Map(SITES.map((site) => [site.id, site]));
const MOVES_BY_SOURCE = new Map<string, DirectedMove[]>();
for (const move of MOVES) {
  const moves = MOVES_BY_SOURCE.get(move.source);
  if (moves) moves.push(move);
  else MOVES_BY_SOURCE.set(move.source, [move]);
}

function keyOf(siteId: string, regime: Regime, heading: Heading) {
  return `${siteId}:${regime}:${heading}`;
}

function headingMomentum(previous: Heading, next: Heading) {
  if (previous === next) return 1.72;
  if (
    (previous === "orbit" && next === "counter") ||
    (previous === "counter" && next === "orbit")
  ) {
    return 0.3;
  }
  return 0.74;
}

function normalizedTransitions(
  entries: ReadonlyMap<number, number>,
): readonly Transition[] {
  const total = [...entries.values()].reduce((sum, value) => sum + value, 0);
  return [...entries.entries()]
    .map(([to, probability]) => ({ to, probability: probability / total }))
    .sort((left, right) => right.probability - left.probability);
}

function stationaryDistribution(
  transitions: readonly (readonly Transition[])[],
): Float64Array {
  const count = transitions.length;
  let current = new Float64Array(count).fill(1 / count);

  for (let iteration = 0; iteration < 4_000; iteration += 1) {
    const next = new Float64Array(count);
    for (let from = 0; from < count; from += 1) {
      for (const transition of transitions[from]) {
        next[transition.to] += current[from] * transition.probability;
      }
    }
    let greatestDifference = 0;
    for (let index = 0; index < count; index += 1) {
      greatestDifference = Math.max(
        greatestDifference,
        Math.abs(next[index] - current[index]),
      );
    }
    current = next;
    if (greatestDifference < 1e-13) break;
  }

  return current;
}

export function createMarkovChain(): MarkovChain {
  const states: ChainState[] = [];
  const stateIndex = new Map<string, number>();

  for (const site of SITES) {
    for (const regime of REGIMES) {
      for (const heading of HEADINGS) {
        stateIndex.set(keyOf(site.id, regime, heading), states.length);
        states.push({ siteId: site.id, regime, heading });
      }
    }
  }

  const transitions = states.map((state) => {
    const weighted = new Map<number, number>();
    const possibleMoves = MOVES_BY_SOURCE.get(state.siteId) ?? [];

    for (const nextRegime of REGIMES) {
      const regimeProbability = REGIME_TRANSITION[state.regime][nextRegime];
      for (const nextHeading of HEADINGS) {
        const stayIndex = stateIndex.get(
          keyOf(state.siteId, nextRegime, nextHeading),
        );
        if (stayIndex === undefined) continue;
        const stayWeight = nextHeading === state.heading ? 0.035 : 0.015;
        weighted.set(
          stayIndex,
          (weighted.get(stayIndex) ?? 0) + regimeProbability * stayWeight,
        );
      }

      const movementWeights = possibleMoves.map((move) => {
        const destination = SITE_BY_ID.get(move.target);
        const destinationWell = destination ? 0.74 + destination.well * 0.52 : 1;
        return (
          move.weight *
          MOVE_AFFINITY[nextRegime][move.heading] *
          headingMomentum(state.heading, move.heading) *
          destinationWell
        );
      });
      const movementTotal = movementWeights.reduce(
        (sum, weight) => sum + weight,
        0,
      );

      possibleMoves.forEach((move, index) => {
        const nextStateIndex = stateIndex.get(
          keyOf(move.target, nextRegime, move.heading),
        );
        if (nextStateIndex === undefined || movementTotal === 0) return;
        const probability =
          regimeProbability * 0.935 * (movementWeights[index] / movementTotal);
        weighted.set(
          nextStateIndex,
          (weighted.get(nextStateIndex) ?? 0) + probability,
        );
      });
    }

    return normalizedTransitions(weighted);
  });

  const stationary = stationaryDistribution(transitions);
  const stationaryBySite = new Float64Array(SITES.length);
  for (let index = 0; index < states.length; index += 1) {
    const siteIndex = SITES.findIndex((site) => site.id === states[index].siteId);
    stationaryBySite[siteIndex] += stationary[index];
  }

  return { states, transitions, stationary, stationaryBySite, stateIndex };
}

export const MARKOV_CHAIN = createMarkovChain();

function nextRandom(randomState: number): readonly [number, number] {
  const next = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
  return [next / 4_294_967_296, next];
}

function sampleTransition(
  transitionList: readonly Transition[],
  randomValue: number,
) {
  let accumulated = 0;
  for (const transition of transitionList) {
    accumulated += transition.probability;
    if (randomValue <= accumulated) return transition.to;
  }
  return transitionList[transitionList.length - 1]?.to ?? 0;
}

export function stateIndexFor(
  chain: MarkovChain,
  siteId: string,
  regime: Regime = "circulate",
  heading: Heading = "orbit",
) {
  return chain.stateIndex.get(keyOf(siteId, regime, heading)) ?? 0;
}

export function createSimulation(
  chain: MarkovChain,
  siteId = "a",
  population = 1_360,
): MarkovSimulation {
  const initial = new Uint16Array(population);
  for (let index = 0; index < population; index += 1) {
    initial[index] = stateIndexFor(
      chain,
      siteId,
      REGIMES[index % REGIMES.length],
      HEADINGS[Math.floor(index / REGIMES.length) % HEADINGS.length],
    );
  }
  return {
    states: initial,
    randomState: 0x8a3c9f17,
    step: 0,
    witness: [initial[0]],
  };
}

export function stepSimulation(
  simulation: MarkovSimulation,
  chain: MarkovChain,
  steps = 1,
): MarkovSimulation {
  let current = simulation.states;
  let randomState = simulation.randomState;
  let witness = simulation.witness;

  for (let round = 0; round < steps; round += 1) {
    const next = new Uint16Array(current.length);
    for (let index = 0; index < current.length; index += 1) {
      const [randomValue, nextRandomState] = nextRandom(randomState);
      randomState = nextRandomState;
      next[index] = sampleTransition(chain.transitions[current[index]], randomValue);
    }
    current = next;
    witness = [...witness.slice(-13), current[0]];
  }

  return {
    states: current,
    randomState,
    step: simulation.step + steps,
    witness,
  };
}

export function injectAtSite(
  simulation: MarkovSimulation,
  chain: MarkovChain,
  siteId: string,
  proportion = 0.58,
): MarkovSimulation {
  const states = new Uint16Array(simulation.states);
  const count = Math.round(states.length * proportion);
  for (let index = 0; index < count; index += 1) {
    states[index] = stateIndexFor(
      chain,
      siteId,
      REGIMES[index % REGIMES.length],
      HEADINGS[Math.floor(index / REGIMES.length) % HEADINGS.length],
    );
  }
  return {
    ...simulation,
    states,
    witness: [...simulation.witness.slice(-11), states[0]],
  };
}

export function countBySite(
  simulation: MarkovSimulation,
  chain: MarkovChain,
) {
  const counts = new Uint16Array(SITES.length);
  for (const stateIndex of simulation.states) {
    const siteIndex = SITES.findIndex(
      (site) => site.id === chain.states[stateIndex].siteId,
    );
    counts[siteIndex] += 1;
  }
  return counts;
}

export function siteTotalVariation(
  simulation: MarkovSimulation,
  chain: MarkovChain,
) {
  const counts = countBySite(simulation, chain);
  let difference = 0;
  for (let index = 0; index < counts.length; index += 1) {
    difference += Math.abs(
      counts[index] / simulation.states.length - chain.stationaryBySite[index],
    );
  }
  return difference / 2;
}

export function topTransitions(
  chain: MarkovChain,
  stateIndex: number,
  limit = 4,
) {
  return chain.transitions[stateIndex].slice(0, limit).map((transition) => ({
    ...transition,
    state: chain.states[transition.to],
  }));
}

export function projectSite(site: Site, width: number, height: number) {
  const scale = Math.min(width * 0.39, height * 0.42);
  return {
    x: width / 2 + site.x * scale,
    y: height / 2 + site.y * scale,
  };
}
