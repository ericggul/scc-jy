export const RGB_STATES = ["red", "green", "blue"] as const;
export const RB_STATES = ["red", "blue"] as const;
export const RAINBOW_STATES = [
  "red", "orange", "yellow", "green", "blue", "indigo", "violet",
] as const;

export type RgbState = (typeof RGB_STATES)[number];
export type RbState = (typeof RB_STATES)[number];
export type RainbowState = (typeof RAINBOW_STATES)[number];
export type ColourState = RgbState | RbState | RainbowState;
export type PaletteMode = "rgb" | "rb" | "rainbow";
export type PaintLayer = "field" | "word";

export type DoubleAutomaton = {
  columns: number;
  rows: number;
  field: Uint8Array;
  words: Uint8Array;
  previousField: Uint8Array;
  previousWords: Uint8Array;
  stateCount: number;
  generation: number;
  fieldRandomState: number;
  wordRandomState: number;
  fieldStalledSteps: number;
  wordStalledSteps: number;
};

export const RGB_CYCLE_THRESHOLD = 3;
export const RAINBOW_CYCLE_THRESHOLD = 2;
export const STALL_ACTIVITY_RATIO = 0.05;
export const STALL_GENERATIONS = 80;

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

function makeLayer(columns: number, rows: number, seed: number, stateCount: number) {
  const cells = new Uint8Array(columns * rows);
  let randomState = seed;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const [noise, next] = nextRandom(randomState);
      randomState = next;
      const patch = (Math.floor(column / 2) + Math.floor(row / 2) * 2) % stateCount;
      cells[row * columns + column] = noise < 0.21 ? Math.floor((noise / 0.21) * stateCount) : patch;
    }
  }
  return { cells, randomState };
}

function makeLifeLayer(columns: number, rows: number, seed: number) {
  const cells = new Uint8Array(columns * rows);
  let randomState = seed;
  for (let index = 0; index < cells.length; index += 1) {
    const [noise, next] = nextRandom(randomState);
    randomState = next;
    cells[index] = noise > 0.82 ? 1 : 0;
  }
  return { cells, randomState };
}

export function createDoubleAutomaton(columns: number, rows: number, stateCount: number = RGB_STATES.length): DoubleAutomaton {
  const field = stateCount === RB_STATES.length
    ? makeLifeLayer(columns, rows, 0x9e3779b9)
    : makeLayer(columns, rows, 0x9e3779b9, stateCount);
  const words = stateCount === RB_STATES.length
    ? makeLifeLayer(columns, rows, 0x6d2b79f5)
    : makeLayer(columns, rows, 0x6d2b79f5, stateCount);
  return {
    columns,
    rows,
    field: field.cells,
    words: words.cells,
    previousField: new Uint8Array(field.cells),
    previousWords: new Uint8Array(words.cells),
    stateCount,
    generation: 0,
    fieldRandomState: field.randomState,
    wordRandomState: words.randomState,
    fieldStalledSteps: 0,
    wordStalledSteps: 0,
  };
}

function stepCycleLayer(
  cells: Uint8Array,
  columns: number,
  rows: number,
  direction: number,
  stateCount: number,
  threshold: number,
) {
  const next = new Uint8Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const current = cells[index]!;
      const counts = Array.from({ length: stateCount }, () => 0);
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          counts[cells[indexOf(column + columnOffset, row + rowOffset, columns, rows)]!] += 1;
        }
      }
      const successor = (current + direction + stateCount) % stateCount;
      next[index] = counts[successor]! >= threshold ? successor : current;
    }
  }
  return next;
}

function stepLifeLayer(cells: Uint8Array, columns: number, rows: number) {
  const next = new Uint8Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let neighbours = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          neighbours += cells[indexOf(column + columnOffset, row + rowOffset, columns, rows)]!;
        }
      }
      const index = row * columns + column;
      next[index] = neighbours === 3 || (cells[index] === 1 && neighbours === 2) ? 1 : 0;
    }
  }
  return next;
}

function changeCount(previous: Uint8Array, next: Uint8Array) {
  return previous.reduce((count, state, index) => count + (state === next[index] ? 0 : 1), 0);
}

function sparkLayer(
  cells: Uint8Array,
  columns: number,
  rows: number,
  stateCount: number,
  randomState: number,
) {
  const sparked = new Uint8Array(cells);
  let state = randomState;
  const [columnNoise, afterColumn] = nextRandom(state);
  const [rowNoise, afterRow] = nextRandom(afterColumn);
  state = afterRow;
  const centerColumn = Math.floor(columnNoise * columns);
  const centerRow = Math.floor(rowNoise * rows);
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      const [colour, next] = nextRandom(state);
      state = next;
      sparked[indexOf(centerColumn + columnOffset, centerRow + rowOffset, columns, rows)] = Math.floor(colour * stateCount);
    }
  }
  return { cells: sparked, randomState: state };
}

function reactivateIfStalled(
  previous: Uint8Array,
  next: Uint8Array,
  columns: number,
  rows: number,
  stateCount: number,
  randomState: number,
  stalledSteps: number,
) {
  const activityFloor = Math.ceil(next.length * STALL_ACTIVITY_RATIO);
  const nextStalledSteps = changeCount(previous, next) < activityFloor ? stalledSteps + 1 : 0;
  if (nextStalledSteps < STALL_GENERATIONS) {
    return { cells: next, randomState, stalledSteps: nextStalledSteps };
  }
  const spark = sparkLayer(next, columns, rows, stateCount, randomState);
  return { cells: spark.cells, randomState: spark.randomState, stalledSteps: 0 };
}

export function stepDoubleAutomaton(automaton: DoubleAutomaton): DoubleAutomaton {
  if (automaton.stateCount === RB_STATES.length) {
    const field = stepLifeLayer(automaton.field, automaton.columns, automaton.rows);
    const words = stepLifeLayer(automaton.words, automaton.columns, automaton.rows);
    return {
      ...automaton,
      field,
      words,
      previousField: automaton.field,
      previousWords: automaton.words,
      generation: automaton.generation + 1,
      fieldStalledSteps: 0,
      wordStalledSteps: 0,
    };
  }
  const threshold = automaton.stateCount === RAINBOW_STATES.length
    ? RAINBOW_CYCLE_THRESHOLD
    : RGB_CYCLE_THRESHOLD;
  const nextField = stepCycleLayer(automaton.field, automaton.columns, automaton.rows, 1, automaton.stateCount, threshold);
  const nextWords = stepCycleLayer(automaton.words, automaton.columns, automaton.rows, -1, automaton.stateCount, threshold);
  const field = reactivateIfStalled(
    automaton.field, nextField, automaton.columns, automaton.rows, automaton.stateCount,
    automaton.fieldRandomState, automaton.fieldStalledSteps,
  );
  const words = reactivateIfStalled(
    automaton.words, nextWords, automaton.columns, automaton.rows, automaton.stateCount,
    automaton.wordRandomState, automaton.wordStalledSteps,
  );
  return {
    ...automaton,
    field: field.cells,
    words: words.cells,
    previousField: automaton.field,
    previousWords: automaton.words,
    generation: automaton.generation + 1,
    fieldRandomState: field.randomState,
    wordRandomState: words.randomState,
    fieldStalledSteps: field.stalledSteps,
    wordStalledSteps: words.stalledSteps,
  };
}

export function paintDoubleAutomaton(
  automaton: DoubleAutomaton,
  column: number,
  row: number,
  layer: PaintLayer,
  state: number,
): DoubleAutomaton {
  const target = layer === "field" ? automaton.field : automaton.words;
  const cells = new Uint8Array(target);
  for (const [columnOffset, rowOffset] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
    cells[indexOf(column + columnOffset, row + rowOffset, automaton.columns, automaton.rows)] = state;
  }
  return layer === "field"
    ? { ...automaton, field: cells, previousField: automaton.field }
    : { ...automaton, words: cells, previousWords: automaton.words };
}

export function countMismatch(automaton: DoubleAutomaton) {
  return automaton.field.reduce(
    (count, state, index) => count + (state === automaton.words[index] ? 0 : 1),
    0,
  );
}
