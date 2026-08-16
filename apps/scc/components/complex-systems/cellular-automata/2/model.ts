export const CYCLIC_STATES = ["red", "green", "blue"] as const;

export type CyclicState = (typeof CYCLIC_STATES)[number];

export type CyclicAutomaton = {
  columns: number;
  rows: number;
  cells: Uint8Array;
  previous: Uint8Array;
  generation: number;
};

export type StateCounts = Record<CyclicState, number>;

export const SUCCESSOR_THRESHOLD = 3;

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function indexOf(column: number, row: number, columns: number, rows: number) {
  const wrappedColumn = (column + columns) % columns;
  const wrappedRow = (row + rows) % rows;
  return wrappedRow * columns + wrappedColumn;
}

export function stateValue(state: CyclicState) {
  return CYCLIC_STATES.indexOf(state);
}

export function createCyclicAutomaton(columns: number, rows: number): CyclicAutomaton {
  const cells = new Uint8Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const broadSeed = unit(column * 2.3 + row * 7.1);
      const clusteredSeed = unit(
        Math.floor(column / 7) * 19 + Math.floor(row / 7) * 31,
      );
      cells[row * columns + column] = Math.floor(
        ((broadSeed * 0.4) + (clusteredSeed * 0.6)) * CYCLIC_STATES.length,
      );
    }
  }
  return { columns, rows, cells, previous: new Uint8Array(cells), generation: 0 };
}

export function stepCyclicAutomaton(automaton: CyclicAutomaton): CyclicAutomaton {
  const { columns, rows, cells } = automaton;
  const next = new Uint8Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const current = cells[index]!;
      const successor = (current + 1) % CYCLIC_STATES.length;
      let successorNeighbors = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          if (cells[indexOf(column + columnOffset, row + rowOffset, columns, rows)] === successor) {
            successorNeighbors += 1;
          }
        }
      }
      next[index] = successorNeighbors >= SUCCESSOR_THRESHOLD ? successor : current;
    }
  }
  return {
    ...automaton,
    cells: next,
    previous: cells,
    generation: automaton.generation + 1,
  };
}

export function paintCyclicAutomaton(
  automaton: CyclicAutomaton,
  centerColumn: number,
  centerRow: number,
  state: CyclicState,
): CyclicAutomaton {
  const cells = new Uint8Array(automaton.cells);
  const brush = [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1]];
  for (const [columnOffset, rowOffset] of brush) {
    cells[indexOf(
      centerColumn + columnOffset!,
      centerRow + rowOffset!,
      automaton.columns,
      automaton.rows,
    )] = stateValue(state);
  }
  return { ...automaton, cells };
}

export function fillCyclicAutomaton(
  automaton: CyclicAutomaton,
  state: CyclicState,
): CyclicAutomaton {
  const cells = new Uint8Array(automaton.cells.length);
  cells.fill(stateValue(state));
  return { ...automaton, cells, previous: automaton.cells, generation: 0 };
}

export function countCyclicStates(automaton: CyclicAutomaton): StateCounts {
  const counts: StateCounts = { red: 0, green: 0, blue: 0 };
  for (const cell of automaton.cells) {
    counts[CYCLIC_STATES[cell]!] += 1;
  }
  return counts;
}
