export const GRID_NETWORK_COLUMNS = 8;
export const GRID_NETWORK_ROWS = 8;
export const GRID_NETWORK_DEPTH = 8;
export const BACKGROUND_BIRTH_RANGE = [3, 3] as const;
export const BACKGROUND_SURVIVAL_RANGE = [2, 3] as const;
export const BORDER_BIRTH_RANGE = [5, 6] as const;
export const BORDER_SURVIVAL_RANGE = [4, 7] as const;
export const MINIMUM_ACTIVITY_RATIO = 0.06;

export type GridNetworkCellState = 0 | 1;
export type GridNetworkEdgeKind = "cardinal" | "diagonal";

export type GridNetworkCell = Readonly<{
  id: string;
  index: number;
  column: number;
  row: number;
  depth: number;
}>;

export type GridNetworkEdge = Readonly<{
  id: string;
  index: number;
  kind: GridNetworkEdgeKind;
  from: GridNetworkCell;
  to: GridNetworkCell;
}>;

export type GridNetwork = Readonly<{
  columns: number;
  rows: number;
  depth: number;
  cells: readonly GridNetworkCell[];
  cardinalEdges: readonly GridNetworkEdge[];
  diagonalEdges: readonly GridNetworkEdge[];
}>;

export type GridNetworkAutomaton = Readonly<{
  network: GridNetwork;
  backgroundStates: Uint8Array;
  borderStates: Uint8Array;
  backgroundInfluencedEdgeIds: ReadonlySet<string>;
  borderInfluencedEdgeIds: ReadonlySet<string>;
  backgroundGeneration: number;
  borderGeneration: number;
}>;

type Offset = readonly [number, number, number];
type LifeRule = Readonly<{
  birthRange: readonly [number, number];
  survivalRange: readonly [number, number];
}>;

const CARDINAL_OFFSETS: readonly Offset[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const DIAGONAL_OFFSETS: readonly Offset[] = [
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [-1, 0, 1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, 1, -1],
  [0, -1, 1],
  [0, -1, -1],
];

const BACKGROUND_RULE: LifeRule = {
  birthRange: BACKGROUND_BIRTH_RANGE,
  survivalRange: BACKGROUND_SURVIVAL_RANGE,
};

const BORDER_RULE: LifeRule = {
  birthRange: BORDER_BIRTH_RANGE,
  survivalRange: BORDER_SURVIVAL_RANGE,
};

function cellId(column: number, row: number, depth: number) {
  return `cell-${column}-${row}-${depth}`;
}

function indexOf(
  column: number,
  row: number,
  depth: number,
  columns: number,
  rows: number,
) {
  return depth * rows * columns + row * columns + column;
}

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function createCell(
  column: number,
  row: number,
  depth: number,
  columns: number,
  rows: number,
): GridNetworkCell {
  return {
    id: cellId(column, row, depth),
    index: indexOf(column, row, depth, columns, rows),
    column,
    row,
    depth,
  };
}

function edgeIdForCells(source: GridNetworkCell, neighbour: GridNetworkCell) {
  return source.index < neighbour.index
    ? `${source.id}-${neighbour.id}`
    : `${neighbour.id}-${source.id}`;
}

function createsUniqueEdge(
  columnOffset: number,
  rowOffset: number,
  depthOffset: number,
) {
  return columnOffset > 0
    || (columnOffset === 0 && rowOffset > 0)
    || (columnOffset === 0 && rowOffset === 0 && depthOffset > 0);
}

function createEdges(
  cells: readonly GridNetworkCell[],
  columns: number,
  rows: number,
  depth: number,
  kind: GridNetworkEdgeKind,
  offsets: readonly Offset[],
) {
  const cellsById = new Map(cells.map((cell) => [cell.id, cell]));
  const edges: GridNetworkEdge[] = [];

  for (const cell of cells) {
    for (const [columnOffset, rowOffset, depthOffset] of offsets) {
      if (!createsUniqueEdge(columnOffset, rowOffset, depthOffset)) continue;
      const neighbourColumn = cell.column + columnOffset;
      const neighbourRow = cell.row + rowOffset;
      const neighbourDepth = cell.depth + depthOffset;
      if (
        neighbourColumn < 0
        || neighbourColumn >= columns
        || neighbourRow < 0
        || neighbourRow >= rows
        || neighbourDepth < 0
        || neighbourDepth >= depth
      ) continue;
      const neighbour = cellsById.get(cellId(
        neighbourColumn,
        neighbourRow,
        neighbourDepth,
      ));
      if (!neighbour) continue;
      edges.push({
        id: edgeIdForCells(cell, neighbour),
        index: edges.length,
        kind,
        from: cell,
        to: neighbour,
      });
    }
  }

  return edges;
}

export function createGridNetwork(
  columns = GRID_NETWORK_COLUMNS,
  rows = GRID_NETWORK_ROWS,
  depth = GRID_NETWORK_DEPTH,
): GridNetwork {
  const cells: GridNetworkCell[] = [];
  for (let currentDepth = 0; currentDepth < depth; currentDepth += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        cells.push(createCell(column, row, currentDepth, columns, rows));
      }
    }
  }

  return {
    columns,
    rows,
    depth,
    cells,
    cardinalEdges: createEdges(
      cells,
      columns,
      rows,
      depth,
      "cardinal",
      CARDINAL_OFFSETS,
    ),
    diagonalEdges: createEdges(
      cells,
      columns,
      rows,
      depth,
      "diagonal",
      DIAGONAL_OFFSETS,
    ),
  };
}

function seededState(
  column: number,
  row: number,
  depth: number,
  seedOffset: number,
): GridNetworkCellState {
  const broadNoise = unit(
    column * 11.7 + row * 23.9 + depth * 17.3 + seedOffset,
  );
  const clusteredNoise = unit(
    Math.floor(column / 2) * 19
    + Math.floor(row / 2) * 31
    + Math.floor(depth / 2) * 43
    + seedOffset,
  );
  return broadNoise * 0.6 + clusteredNoise * 0.4 > 0.51 ? 1 : 0;
}

export function createGridNetworkAutomaton(
  columns = GRID_NETWORK_COLUMNS,
  rows = GRID_NETWORK_ROWS,
  depth = GRID_NETWORK_DEPTH,
): GridNetworkAutomaton {
  const network = createGridNetwork(columns, rows, depth);
  const backgroundStates = new Uint8Array(network.cells.length);
  const borderStates = new Uint8Array(network.cells.length);

  for (const cell of network.cells) {
    backgroundStates[cell.index] = seededState(
      cell.column,
      cell.row,
      cell.depth,
      0,
    );
    borderStates[cell.index] = seededState(
      cell.column,
      cell.row,
      cell.depth,
      97.41,
    );
  }

  return {
    network,
    backgroundStates,
    borderStates,
    backgroundInfluencedEdgeIds: new Set(),
    borderInfluencedEdgeIds: new Set(),
    backgroundGeneration: 0,
    borderGeneration: 0,
  };
}

export function gridNetworkStatesDiffer(
  states: Uint8Array,
  edge: GridNetworkEdge,
) {
  return states[edge.from.index] !== states[edge.to.index];
}

function livingNeighbours(
  states: Uint8Array,
  network: GridNetwork,
  cell: GridNetworkCell,
  offsets: readonly Offset[],
) {
  let count = 0;

  for (const [columnOffset, rowOffset, depthOffset] of offsets) {
    const column = cell.column + columnOffset;
    const row = cell.row + rowOffset;
    const depth = cell.depth + depthOffset;
    if (
      column < 0
      || column >= network.columns
      || row < 0
      || row >= network.rows
      || depth < 0
      || depth >= network.depth
    ) continue;
    count += states[indexOf(
      column,
      row,
      depth,
      network.columns,
      network.rows,
    )]!;
  }

  return count;
}

function isWithinRange(value: number, range: readonly [number, number]) {
  return value >= range[0] && value <= range[1];
}

function nextStateFor(
  alive: boolean,
  livingNeighbourCount: number,
  rule: LifeRule,
): GridNetworkCellState {
  return alive
    ? (isWithinRange(livingNeighbourCount, rule.survivalRange) ? 1 : 0)
    : (isWithinRange(livingNeighbourCount, rule.birthRange) ? 1 : 0);
}

function spark(
  states: Uint8Array,
  network: GridNetwork,
  generation: number,
  seedOffset: number,
) {
  for (let patch = 0; patch < 3; patch += 1) {
    const centerColumn = (generation * 5 + patch * 3 + seedOffset) % network.columns;
    const centerRow = (generation * 7 + patch * 5 + seedOffset) % network.rows;
    const centerDepth = (generation * 11 + patch * 7 + seedOffset) % network.depth;
    const centerIndex = indexOf(
      centerColumn,
      centerRow,
      centerDepth,
      network.columns,
      network.rows,
    );
    const centerState = states[centerIndex]!;

    for (let depthOffset = -1; depthOffset <= 1; depthOffset += 1) {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const column = centerColumn + columnOffset;
          const row = centerRow + rowOffset;
          const depth = centerDepth + depthOffset;
          if (
            column < 0
            || column >= network.columns
            || row < 0
            || row >= network.rows
            || depth < 0
            || depth >= network.depth
          ) continue;
          states[indexOf(column, row, depth, network.columns, network.rows)] = unit(
            (column + generation * 13 + patch * 17 + seedOffset) * 2.7
            + (row + generation * 19 + patch * 23 + seedOffset) * 5.1
            + (depth + generation * 29 + patch * 31 + seedOffset) * 7.3,
          ) > 0.43 ? 1 : 0;
        }
      }
    }

    states[centerIndex] = centerState === 1 ? 0 : 1;
  }
}

function edgeId(
  network: GridNetwork,
  column: number,
  row: number,
  depth: number,
  neighbourColumn: number,
  neighbourRow: number,
  neighbourDepth: number,
) {
  const sourceIndex = indexOf(column, row, depth, network.columns, network.rows);
  const neighbourIndex = indexOf(
    neighbourColumn,
    neighbourRow,
    neighbourDepth,
    network.columns,
    network.rows,
  );
  const source = network.cells[sourceIndex]!;
  const neighbour = network.cells[neighbourIndex]!;
  return edgeIdForCells(source, neighbour);
}

function stepLayer(
  states: Uint8Array,
  network: GridNetwork,
  generation: number,
  offsets: readonly Offset[],
  rule: LifeRule,
  seedOffset: number,
) {
  const nextStates = new Uint8Array(states.length);
  const influencedEdgeIds = new Set<string>();
  let changedCells = 0;

  for (const cell of network.cells) {
    const neighbours = livingNeighbours(states, network, cell, offsets);
    const alive = states[cell.index] === 1;
    const next = nextStateFor(alive, neighbours, rule);
    nextStates[cell.index] = next;
    if (next === states[cell.index]) continue;

    changedCells += 1;
    for (const [columnOffset, rowOffset, depthOffset] of offsets) {
      const column = cell.column + columnOffset;
      const row = cell.row + rowOffset;
      const depth = cell.depth + depthOffset;
      if (
        column < 0
        || column >= network.columns
        || row < 0
        || row >= network.rows
        || depth < 0
        || depth >= network.depth
      ) continue;
      if (states[indexOf(
        column,
        row,
        depth,
        network.columns,
        network.rows,
      )] !== 1) continue;

      if (nextStateFor(alive, neighbours - 1, rule) !== next) {
        influencedEdgeIds.add(edgeId(
          network,
          cell.column,
          cell.row,
          cell.depth,
          column,
          row,
          depth,
        ));
      }
    }
  }

  if (changedCells < Math.ceil(network.cells.length * MINIMUM_ACTIVITY_RATIO)) {
    spark(nextStates, network, generation, seedOffset);
    return { states: nextStates, influencedEdgeIds };
  }

  return { states: nextStates, influencedEdgeIds };
}

export function stepGridNetworkBackground(
  automaton: GridNetworkAutomaton,
): GridNetworkAutomaton {
  const layer = stepLayer(
    automaton.backgroundStates,
    automaton.network,
    automaton.backgroundGeneration,
    CARDINAL_OFFSETS,
    BACKGROUND_RULE,
    3,
  );

  return {
    ...automaton,
    backgroundStates: layer.states,
    backgroundInfluencedEdgeIds: layer.influencedEdgeIds,
    backgroundGeneration: automaton.backgroundGeneration + 1,
  };
}

export function stepGridNetworkBorder(
  automaton: GridNetworkAutomaton,
): GridNetworkAutomaton {
  const layer = stepLayer(
    automaton.borderStates,
    automaton.network,
    automaton.borderGeneration,
    DIAGONAL_OFFSETS,
    BORDER_RULE,
    29,
  );

  return {
    ...automaton,
    borderStates: layer.states,
    borderInfluencedEdgeIds: layer.influencedEdgeIds,
    borderGeneration: automaton.borderGeneration + 1,
  };
}

export function setGridNetworkBackgroundState(
  automaton: GridNetworkAutomaton,
  index: number,
  state: GridNetworkCellState,
): GridNetworkAutomaton {
  if (index < 0 || index >= automaton.network.cells.length) return automaton;

  const backgroundStates = new Uint8Array(automaton.backgroundStates);
  backgroundStates[index] = state;
  return {
    ...automaton,
    backgroundStates,
    backgroundInfluencedEdgeIds: new Set(),
  };
}
