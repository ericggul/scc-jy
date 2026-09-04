import type { SmileAutomaton, SmileResponse, SmileVote } from "./types";

const responseDefinitions = [
  { response: "satisfied", label: "Satisfied" },
  { response: "neutral", label: "Neither satisfied nor dissatisfied" },
  { response: "dissatisfied", label: "Dissatisfied" },
] as const satisfies readonly {
  response: SmileResponse;
  label: string;
}[];

const NEIGHBOUR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

export const SMILE_STEP_MILLISECONDS = 650;
export const SUCCESSOR_TRANSMISSION_CHANCE = 0.46;
export const SUCCESSOR_MUTATION_CHANCE = 0.004;

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function indexOf(column: number, row: number, columns: number, rows: number) {
  const wrappedColumn = (column + columns) % columns;
  const wrappedRow = (row + rows) % rows;
  return wrappedRow * columns + wrappedColumn;
}

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

export function createSmileAutomaton(
  columns: number,
  rows: number,
): SmileAutomaton {
  const cells = new Uint8Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const broadSeed = unit(column * 2.3 + row * 7.1);
      const clusteredSeed = unit(
        Math.floor(column / 7) * 19 + Math.floor(row / 7) * 31,
      );

      cells[row * columns + column] = Math.floor(
        (broadSeed * 0.4 + clusteredSeed * 0.6) * responseDefinitions.length,
      );
    }
  }

  return {
    columns,
    rows,
    cells,
    generation: 0,
    randomState: 0x9e3779b9,
  };
}

export function stepSmileAutomaton(
  automaton: SmileAutomaton,
): SmileAutomaton {
  const { columns, rows, cells } = automaton;
  const nextCells = new Uint8Array(cells.length);
  let randomState = automaton.randomState;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const current = cells[index]!;
      const successor = (current + 1) % responseDefinitions.length;
      let successorNeighbours = 0;

      for (const [columnOffset, rowOffset] of NEIGHBOUR_OFFSETS) {
        if (
          cells[indexOf(
            column + columnOffset,
            row + rowOffset,
            columns,
            rows,
          )] === successor
        ) {
          successorNeighbours += 1;
        }
      }

      const [mutation, afterMutation] = nextRandom(randomState);
      const [transmission, afterTransmission] = nextRandom(afterMutation);
      randomState = afterTransmission;

      nextCells[index] = mutation < SUCCESSOR_MUTATION_CHANCE
        ? successor
        : transmission < SUCCESSOR_TRANSMISSION_CHANCE * (successorNeighbours / 8)
          ? successor
          : current;
    }
  }

  return {
    ...automaton,
    cells: nextCells,
    generation: automaton.generation + 1,
    randomState,
  };
}

export function getSmileVotes(
  automaton: SmileAutomaton,
): readonly SmileVote[] {
  return Array.from({ length: automaton.cells.length }, (_, index) => {
    const response = responseDefinitions[automaton.cells[index]!];
    const column = index % automaton.columns;
    const row = Math.floor(index / automaton.columns);

    return {
      id: `smile-vote-${column}-${row}`,
      ...response,
    };
  });
}
