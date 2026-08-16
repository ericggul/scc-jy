export const RAINBOW_STATES = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "violet",
] as const;

export type RainbowState = (typeof RAINBOW_STATES)[number];
export type RainbowMode = "probabilistic" | "cycle";

export type RainbowAutomaton = {
  columns: number;
  rows: number;
  cells: Uint8Array;
  previous: Uint8Array;
  generation: number;
  randomState: number;
};

export type StateCounts = Record<RainbowState, number>;

export const TRANSMISSION_CHANCE = 0.46;
export const MUTATION_CHANCE = 0.004;

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function indexOf(column: number, row: number, columns: number, rows: number) {
  return ((row + rows) % rows) * columns + ((column + columns) % columns);
}

export function stateValue(state: RainbowState) {
  return RAINBOW_STATES.indexOf(state);
}

export function createRainbowAutomaton(columns: number, rows: number): RainbowAutomaton {
  const cells = new Uint8Array(columns * rows);
  let randomState = 0x9e3779b9;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const [noise, next] = nextRandom(randomState);
      randomState = next;
      const patch = (
        Math.floor(column / 9) + Math.floor(row / 9) * 2
      ) % RAINBOW_STATES.length;
      cells[row * columns + column] = noise < 0.18
        ? Math.floor((noise / 0.18) * RAINBOW_STATES.length)
        : patch;
    }
  }
  return { columns, rows, cells, previous: new Uint8Array(cells), generation: 0, randomState };
}

function neighborCounts(automaton: RainbowAutomaton, column: number, row: number) {
  const counts = Array.from({ length: RAINBOW_STATES.length }, () => 0);
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      counts[automaton.cells[indexOf(
        column + columnOffset,
        row + rowOffset,
        automaton.columns,
        automaton.rows,
      )]! ] += 1;
    }
  }
  return counts;
}

export function selectTransmittedState(
  current: number,
  counts: readonly number[],
  random: number,
) {
  const foreignTotal = counts.reduce(
    (total, count, state) => total + (state === current ? 0 : count),
    0,
  );
  if (foreignTotal === 0) return current;
  let selection = random * foreignTotal;
  for (let state = 0; state < RAINBOW_STATES.length; state += 1) {
    if (state === current) continue;
    selection -= counts[state]!;
    if (selection < 0) return state;
  }
  return current;
}

export function stepRainbowAutomaton(
  automaton: RainbowAutomaton,
  mode: RainbowMode = "probabilistic",
): RainbowAutomaton {
  const next = new Uint8Array(automaton.cells.length);
  let randomState = automaton.randomState;
  for (let row = 0; row < automaton.rows; row += 1) {
    for (let column = 0; column < automaton.columns; column += 1) {
      const index = row * automaton.columns + column;
      const current = automaton.cells[index]!;
      const counts = neighborCounts(automaton, column, row);
      if (mode === "cycle") {
        const successor = (current + 1) % RAINBOW_STATES.length;
        next[index] = counts[successor]! >= 3 ? successor : current;
        continue;
      }
      const foreignNeighbors = 8 - counts[current]!;
      const [mutation, afterMutation] = nextRandom(randomState);
      const [transmission, afterTransmission] = nextRandom(afterMutation);
      const [choice, afterChoice] = nextRandom(afterTransmission);
      randomState = afterChoice;
      if (mutation < MUTATION_CHANCE) {
        next[index] = Math.floor(transmission * RAINBOW_STATES.length);
      } else if (transmission < TRANSMISSION_CHANCE * (foreignNeighbors / 8)) {
        next[index] = selectTransmittedState(current, counts, choice);
      } else {
        next[index] = current;
      }
    }
  }
  return {
    ...automaton,
    cells: next,
    previous: automaton.cells,
    generation: automaton.generation + 1,
    randomState,
  };
}

export function paintRainbowAutomaton(
  automaton: RainbowAutomaton,
  centerColumn: number,
  centerRow: number,
  state: RainbowState,
): RainbowAutomaton {
  const cells = new Uint8Array(automaton.cells);
  for (const [columnOffset, rowOffset] of [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) {
    cells[indexOf(
      centerColumn + columnOffset,
      centerRow + rowOffset,
      automaton.columns,
      automaton.rows,
    )] = stateValue(state);
  }
  return { ...automaton, cells };
}

export function fillRainbowAutomaton(
  automaton: RainbowAutomaton,
  state: RainbowState,
): RainbowAutomaton {
  const cells = new Uint8Array(automaton.cells.length);
  cells.fill(stateValue(state));
  return { ...automaton, cells, previous: automaton.cells, generation: 0 };
}

export function countRainbowStates(automaton: RainbowAutomaton): StateCounts {
  const counts = {} as StateCounts;
  for (const state of RAINBOW_STATES) counts[state] = 0;
  for (const cell of automaton.cells) counts[RAINBOW_STATES[cell]!] += 1;
  return counts;
}
