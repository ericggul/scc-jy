export const GRID_NETWORK_COLUMNS = 48;
export const GRID_NETWORK_ROWS = 48;
export const GRID_NETWORK_COLOURS = ["red", "green", "blue"] as const;
export const SUCCESSOR_THRESHOLD = 3;
export const MINIMUM_ACTIVITY_RATIO = 0.075;
export const QUIET_STEP_LIMIT = 3;

export type GridNetworkColour = (typeof GRID_NETWORK_COLOURS)[number];
export type GridNetworkCellState = 0 | 1 | 2;

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

function indexOf(column: number, row: number, columns: number) {
  return row * columns + column;
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

function seededState(
  column: number,
  row: number,
  seedOffset: number,
): GridNetworkCellState {
  const broadNoise = unit(column * 11.7 + row * 23.9 + seedOffset);
  const clusteredNoise = unit(
    Math.floor(column / 3) * 19 + Math.floor(row / 3) * 31 + seedOffset,
  );
  const state = Math.floor(
    (broadNoise * 0.4 + clusteredNoise * 0.6) * GRID_NETWORK_COLOURS.length,
  );
  return state as GridNetworkCellState;
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

export function colourForState(state: GridNetworkCellState): GridNetworkColour {
  return GRID_NETWORK_COLOURS[state]!;
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

function successorFor(state: number): GridNetworkCellState {
  return ((state + 1) % GRID_NETWORK_COLOURS.length) as GridNetworkCellState;
}

function successorNeighbourCount(
  states: Uint8Array,
  network: GridNetwork,
  column: number,
  row: number,
  successor: GridNetworkCellState,
  offsets: readonly (readonly [number, number])[],
) {
  let count = 0;

  for (const [columnOffset, rowOffset] of offsets) {
    const neighbourColumn = column + columnOffset;
    const neighbourRow = row + rowOffset;
    if (
      neighbourColumn < 0
      || neighbourColumn >= network.columns
      || neighbourRow < 0
      || neighbourRow >= network.rows
    ) continue;
    if (states[indexOf(
      neighbourColumn,
      neighbourRow,
      network.columns,
    )] === successor) {
      count += 1;
    }
  }

  return count;
}

function spark(
  states: Uint8Array,
  network: GridNetwork,
  generation: number,
  seedOffset: number,
) {
  for (let patch = 0; patch < 6; patch += 1) {
    const centerColumn = (generation * 7 + patch * 11 + seedOffset) % network.columns;
    const centerRow = (generation * 11 + patch * 7 + seedOffset) % network.rows;

    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
      for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
        const column = centerColumn + columnOffset;
        const row = centerRow + rowOffset;
        const state = Math.floor(unit(
          (column + generation * 17 + patch * 31 + seedOffset) * 2.3
          + (row + generation * 13 + patch * 19 + seedOffset) * 7.1,
        ) * GRID_NETWORK_COLOURS.length) as GridNetworkCellState;
        if (
          column < 0
          || column >= network.columns
          || row < 0
          || row >= network.rows
        ) continue;
        states[indexOf(column, row, network.columns)] = state;
      }
    }
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
    const current = states[cell.index]! as GridNetworkCellState;
    const successor = successorFor(current);
    const successors = successorNeighbourCount(
      states,
      network,
      cell.column,
      cell.row,
      successor,
      offsets,
    );
    const next = successors >= SUCCESSOR_THRESHOLD ? successor : current;
    nextStates[cell.index] = next;
    if (next === current) continue;

    changedCells += 1;
    if (successors !== SUCCESSOR_THRESHOLD) continue;

    for (const [columnOffset, rowOffset] of offsets) {
      const neighbourColumn = cell.column + columnOffset;
      const neighbourRow = cell.row + rowOffset;
      if (
        neighbourColumn < 0
        || neighbourColumn >= network.columns
        || neighbourRow < 0
        || neighbourRow >= network.rows
      ) continue;
      if (states[indexOf(
        neighbourColumn,
        neighbourRow,
        network.columns,
      )] !== successor) continue;
      influencedEdgeIds.add(gridNetworkEdgeId(
        cell.column,
        cell.row,
        neighbourColumn,
        neighbourRow,
      ));
    }
  }

  const minimumChangedCells = Math.max(
    3,
    Math.ceil(network.cells.length * MINIMUM_ACTIVITY_RATIO),
  );
  const nextStalledSteps = changedCells < minimumChangedCells
    ? stalledSteps + 1
    : 0;
  if (nextStalledSteps >= QUIET_STEP_LIMIT) {
    spark(nextStates, network, generation, seedOffset);
    return { states: nextStates, influencedEdgeIds, stalledSteps: 0 };
  }

  return { states: nextStates, influencedEdgeIds, stalledSteps: nextStalledSteps };
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
