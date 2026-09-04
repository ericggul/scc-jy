export const GRID_NETWORK_COLUMNS = 24;
export const GRID_NETWORK_ROWS = 24;

export type GridNetworkTone = "black" | "white";
export type GridNetworkCellState = 0 | 1;

export type GridNetworkCell = Readonly<{
  id: string;
  index: number;
  column: number;
  row: number;
}>;

export type GridNetworkEdge = Readonly<{
  id: string;
  from: GridNetworkCell;
  to: GridNetworkCell;
}>;

export type GridNetwork = Readonly<{
  columns: number;
  rows: number;
  cells: readonly GridNetworkCell[];
  edges: readonly GridNetworkEdge[];
}>;

export type GridNetworkAutomaton = Readonly<{
  network: GridNetwork;
  backgroundStates: Uint8Array;
  borderStates: Uint8Array;
  backgroundInfluencedEdgeIds: ReadonlySet<string>;
  borderInfluencedEdgeIds: ReadonlySet<string>;
  backgroundGeneration: number;
  borderGeneration: number;
  backgroundStalledSteps: number;
  borderStalledSteps: number;
}>;

function cellId(column: number, row: number) {
  return `cell-${column}-${row}`;
}

export function gridNetworkEdgeId(
  column: number,
  row: number,
  neighbourColumn: number,
  neighbourRow: number,
) {
  if (
    neighbourColumn < column
    || (neighbourColumn === column && neighbourRow < row)
  ) {
    return `${cellId(neighbourColumn, neighbourRow)}-${cellId(column, row)}`;
  }

  return `${cellId(column, row)}-${cellId(neighbourColumn, neighbourRow)}`;
}

export function gridNetworkStatesDiffer(
  states: Uint8Array,
  network: GridNetwork,
  column: number,
  row: number,
  neighbourColumn: number,
  neighbourRow: number,
) {
  if (
    column < 0
    || column >= network.columns
    || row < 0
    || row >= network.rows
    || neighbourColumn < 0
    || neighbourColumn >= network.columns
    || neighbourRow < 0
    || neighbourRow >= network.rows
  ) return false;

  return states[indexOf(column, row, network.columns)]
    !== states[indexOf(neighbourColumn, neighbourRow, network.columns)];
}

function indexOf(column: number, row: number, columns: number) {
  return row * columns + column;
}

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createCell(column: number, row: number, columns: number): GridNetworkCell {
  return {
    id: cellId(column, row),
    index: indexOf(column, row, columns),
    column,
    row,
  };
}

export function createGridNetwork(
  columns = GRID_NETWORK_COLUMNS,
  rows = GRID_NETWORK_ROWS,
): GridNetwork {
  const cells = Array.from({ length: rows }, (_, row) => (
    Array.from({ length: columns }, (_, column) => createCell(column, row, columns))
  )).flat();
  const cellsById = new Map(cells.map((cell) => [cell.id, cell]));
  const edges: GridNetworkEdge[] = [];

  for (const cell of cells) {
    for (const [column, row] of [
      [cell.column + 1, cell.row],
      [cell.column, cell.row + 1],
      [cell.column + 1, cell.row + 1],
      [cell.column + 1, cell.row - 1],
    ] as const) {
      const neighbour = cellsById.get(cellId(column, row));
      if (!neighbour) continue;
      edges.push({
        id: `${cell.id}-${neighbour.id}`,
        from: cell,
        to: neighbour,
      });
    }
  }

  return { columns, rows, cells, edges };
}

function seededState(column: number, row: number, seedOffset: number) {
  const broadNoise = unit(column * 11.7 + row * 23.9 + seedOffset);
  const localNoise = unit(
    Math.floor(column / 3) * 37 + Math.floor(row / 3) * 53 + seedOffset,
  );
  return broadNoise * 0.68 + localNoise * 0.32 > 0.51 ? 1 : 0;
}

export function createGridNetworkAutomaton(
  columns = GRID_NETWORK_COLUMNS,
  rows = GRID_NETWORK_ROWS,
): GridNetworkAutomaton {
  const network = createGridNetwork(columns, rows);
  const backgroundStates = new Uint8Array(network.cells.length);
  const borderStates = new Uint8Array(network.cells.length);

  for (const cell of network.cells) {
    backgroundStates[cell.index] = seededState(cell.column, cell.row, 0);
    borderStates[cell.index] = seededState(cell.column, cell.row, 97.41);
  }

  return {
    network,
    backgroundStates,
    borderStates,
    backgroundInfluencedEdgeIds: new Set(),
    borderInfluencedEdgeIds: new Set(),
    backgroundGeneration: 0,
    borderGeneration: 0,
    backgroundStalledSteps: 0,
    borderStalledSteps: 0,
  };
}

export function toneForState(state: GridNetworkCellState): GridNetworkTone {
  return state === 1 ? "black" : "white";
}

const CARDINAL_NEIGHBOURS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

const DIAGONAL_NEIGHBOURS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

function livingNeighbours(
  states: Uint8Array,
  network: GridNetwork,
  column: number,
  row: number,
  offsets: readonly (readonly [number, number])[],
) {
  const { columns, rows } = network;
  let count = 0;

  for (const [columnOffset, rowOffset] of offsets) {
    const neighbourColumn = column + columnOffset;
    const neighbourRow = row + rowOffset;
    if (
      neighbourColumn < 0
      || neighbourColumn >= columns
      || neighbourRow < 0
      || neighbourRow >= rows
    ) continue;
    count += states[indexOf(neighbourColumn, neighbourRow, columns)]!;
  }

  return count;
}

function nextStateFor(
  alive: boolean,
  livingNeighbourCount: number,
): GridNetworkCellState {
  return alive
    ? (livingNeighbourCount === 1 || livingNeighbourCount === 2 ? 1 : 0)
    : (livingNeighbourCount === 2 ? 1 : 0);
}

function spark(
  states: Uint8Array,
  network: GridNetwork,
  generation: number,
  seedOffset: number,
) {
  const column = (generation * 7 + seedOffset) % network.columns;
  const row = (generation * 11 + seedOffset) % network.rows;

  for (const [columnOffset, rowOffset] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const targetColumn = column + columnOffset;
    const targetRow = row + rowOffset;
    if (
      targetColumn < 0
      || targetColumn >= network.columns
      || targetRow < 0
      || targetRow >= network.rows
    ) continue;
    states[indexOf(targetColumn, targetRow, network.columns)] = 1;
  }
}

function stepLayer(
  states: Uint8Array,
  network: GridNetwork,
  generation: number,
  stalledSteps: number,
  offsets: readonly (readonly [number, number])[],
  seedOffset: number,
) {
  const nextStates = new Uint8Array(states.length);
  const influencedEdgeIds = new Set<string>();
  let changedCells = 0;

  for (const cell of network.cells) {
    const neighbours = livingNeighbours(
      states,
      network,
      cell.column,
      cell.row,
      offsets,
    );
    const alive = states[cell.index] === 1;
    const next = nextStateFor(alive, neighbours);
    nextStates[cell.index] = next;
    if (next === states[cell.index]) continue;

    changedCells += 1;
    for (const [columnOffset, rowOffset] of offsets) {
      const neighbourColumn = cell.column + columnOffset;
      const neighbourRow = cell.row + rowOffset;
      if (
        neighbourColumn < 0
        || neighbourColumn >= network.columns
        || neighbourRow < 0
        || neighbourRow >= network.rows
      ) continue;

      const neighbourState = states[indexOf(
        neighbourColumn,
        neighbourRow,
        network.columns,
      )]!;
      if (neighbourState !== 1) continue;

      const alternateNeighbourCount = neighbours - 1;
      if (nextStateFor(alive, alternateNeighbourCount) !== next) {
        influencedEdgeIds.add(gridNetworkEdgeId(
          cell.column,
          cell.row,
          neighbourColumn,
          neighbourRow,
        ));
      }
    }
  }

  const nextStalledSteps = changedCells < 3 ? stalledSteps + 1 : 0;
  if (nextStalledSteps >= 12) {
    spark(nextStates, network, generation, seedOffset);
    return { states: nextStates, stalledSteps: 0, influencedEdgeIds };
  }

  return { states: nextStates, stalledSteps: nextStalledSteps, influencedEdgeIds };
}

export function stepGridNetworkBackground(
  automaton: GridNetworkAutomaton,
): GridNetworkAutomaton {
  const layer = stepLayer(
    automaton.backgroundStates,
    automaton.network,
    automaton.backgroundGeneration,
    automaton.backgroundStalledSteps,
    CARDINAL_NEIGHBOURS,
    3,
  );

  return {
    ...automaton,
    backgroundStates: layer.states,
    backgroundInfluencedEdgeIds: layer.influencedEdgeIds,
    backgroundGeneration: automaton.backgroundGeneration + 1,
    backgroundStalledSteps: layer.stalledSteps,
  };
}

export function stepGridNetworkBorder(
  automaton: GridNetworkAutomaton,
): GridNetworkAutomaton {
  const layer = stepLayer(
    automaton.borderStates,
    automaton.network,
    automaton.borderGeneration,
    automaton.borderStalledSteps,
    DIAGONAL_NEIGHBOURS,
    29,
  );

  return {
    ...automaton,
    borderStates: layer.states,
    borderInfluencedEdgeIds: layer.influencedEdgeIds,
    borderGeneration: automaton.borderGeneration + 1,
    borderStalledSteps: layer.stalledSteps,
  };
}

export function setGridNetworkBackgroundState(
  automaton: GridNetworkAutomaton,
  column: number,
  row: number,
  state: GridNetworkCellState,
): GridNetworkAutomaton {
  const { columns, rows } = automaton.network;
  if (column < 0 || column >= columns || row < 0 || row >= rows) {
    return automaton;
  }

  const states = new Uint8Array(automaton.backgroundStates);
  const index = indexOf(column, row, columns);
  if (states[index] === state) return automaton;
  states[index] = state;

  return {
    ...automaton,
    backgroundStates: states,
    backgroundInfluencedEdgeIds: new Set(),
  };
}
