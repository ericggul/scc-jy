export const LAYER_COUNT = 9;
export type PaletteMode = "rb" | "rgb" | "rainbow" | "taegeuk";
export type PaintState = "white" | "black" | "red" | "orange" | "yellow" | "green" | "blue" | "indigo" | "violet";

export type HexAutomaton = {
  columns: number;
  rows: number;
  layers: readonly Uint8Array[];
  previousLayers: readonly Uint8Array[];
  mode: PaletteMode;
  layerCount: number;
  generation: number;
};

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

function seedLayer(length: number, seed: number, stateCount: number) {
  const cells = new Uint8Array(length);
  let randomState = seed;
  for (let index = 0; index < cells.length; index += 1) {
    const [noise, next] = nextRandom(randomState);
    randomState = next;
    cells[index] = stateCount === 2 ? (noise > 0.77 ? 1 : 0) : Math.floor(noise * stateCount);
  }
  return cells;
}

export function createHexAutomaton(columns: number, rows: number, mode: PaletteMode = "rb", layerCount = LAYER_COUNT): HexAutomaton {
  const stateCount = mode === "rb" ? 2 : mode === "rgb" ? 3 : mode === "taegeuk" ? 4 : 7;
  const layers = Array.from({ length: layerCount }, (_, index) => seedLayer(columns * rows, 0x9e3779b9 + index * 0x1f123bb5, stateCount));
  return { columns, rows, layers, previousLayers: layers.map((layer) => new Uint8Array(layer)), mode, layerCount, generation: 0 };
}

function neighbourOffsets(column: number) {
  return column % 2 === 0
    ? [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [0, 1]]
    : [[1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1], [0, 1]];
}

function stepLife(cells: Uint8Array, columns: number, rows: number) {
  const next = new Uint8Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const neighbours = neighbourOffsets(column).reduce(
        (count, [columnOffset, rowOffset]) => count + cells[indexOf(column + columnOffset!, row + rowOffset!, columns, rows)]!,
        0,
      );
      const index = row * columns + column;
      next[index] = neighbours === 3 || (cells[index] === 1 && neighbours === 2) ? 1 : 0;
    }
  }
  return next;
}

function stepCycle(cells: Uint8Array, columns: number, rows: number, stateCount: number) {
  const next = new Uint8Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const successor = (cells[index]! + 1) % stateCount;
      const successors = neighbourOffsets(column).reduce(
        (count, [columnOffset, rowOffset]) => count + (cells[indexOf(column + columnOffset!, row + rowOffset!, columns, rows)] === successor ? 1 : 0),
        0,
      );
      next[index] = successors >= 2 ? successor : cells[index]!;
    }
  }
  return next;
}

export function stepHexAutomaton(automaton: HexAutomaton): HexAutomaton {
  const stateCount = automaton.mode === "rb" ? 2 : automaton.mode === "rgb" ? 3 : automaton.mode === "taegeuk" ? 4 : 7;
  return {
    ...automaton,
    layers: automaton.layers.map((layer) => automaton.mode === "rb" ? stepLife(layer, automaton.columns, automaton.rows) : stepCycle(layer, automaton.columns, automaton.rows, stateCount)),
    previousLayers: automaton.layers,
    generation: automaton.generation + 1,
  };
}

export function paintHexAutomaton(automaton: HexAutomaton, column: number, row: number, state: PaintState): HexAutomaton {
  const paletteIndex = ["white", "black", "red", "orange", "yellow", "green", "blue", "indigo", "violet"].indexOf(state);
  const value = automaton.mode === "rb"
    ? (state === "blue" ? 1 : 0)
    : automaton.mode === "rgb"
    ? [2, 5, 6].indexOf(paletteIndex)
    : automaton.mode === "taegeuk"
    ? [0, 1, 2, 6].indexOf(paletteIndex)
    : paletteIndex - 2;
  const layers = automaton.layers.map((layer) => {
    const target = new Uint8Array(layer);
    for (const [columnOffset, rowOffset] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
      target[indexOf(column + columnOffset, row + rowOffset, automaton.columns, automaton.rows)] = value;
    }
    return target;
  });
  return { ...automaton, layers, previousLayers: automaton.layers };
}

export function countDivergentCells(automaton: HexAutomaton) {
  let count = 0;
  for (let index = 0; index < automaton.layers[0]!.length; index += 1) {
    const first = automaton.layers[0]![index];
    if (automaton.layers.some((layer) => layer[index] !== first)) count += 1;
  }
  return count;
}
