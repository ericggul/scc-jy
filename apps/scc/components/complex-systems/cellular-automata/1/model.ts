export type Automaton = {
  columns: number;
  rows: number;
  cells: Uint8Array;
  previous: Uint8Array;
  generation: number;
};

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function indexOf(column: number, row: number, columns: number, rows: number) {
  const wrappedColumn = (column + columns) % columns;
  const wrappedRow = (row + rows) % rows;
  return wrappedRow * columns + wrappedColumn;
}

export function createAutomaton(columns: number, rows: number): Automaton {
  const cells = new Uint8Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const broadSeed = unit(column * 2.3 + row * 7.1);
      const clusteredSeed = unit(
        Math.floor(column / 5) * 19 + Math.floor(row / 5) * 31,
      );
      cells[index] = broadSeed > 0.79 && clusteredSeed > 0.24 ? 1 : 0;
    }
  }
  return {
    columns,
    rows,
    cells,
    previous: new Uint8Array(cells),
    generation: 0,
  };
}

export function stepAutomaton(automaton: Automaton): Automaton {
  const { columns, rows, cells } = automaton;
  const next = new Uint8Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let neighbors = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          neighbors += cells[
            indexOf(column + columnOffset, row + rowOffset, columns, rows)
          ];
        }
      }
      const index = row * columns + column;
      const alive = cells[index] === 1;
      next[index] = neighbors === 3 || (alive && neighbors === 2) ? 1 : 0;
    }
  }
  return {
    ...automaton,
    cells: next,
    previous: cells,
    generation: automaton.generation + 1,
  };
}

export function paintAutomaton(
  automaton: Automaton,
  centerColumn: number,
  centerRow: number,
): Automaton {
  const cells = new Uint8Array(automaton.cells);
  const brush = [
    [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1],
  ];
  for (const [columnOffset, rowOffset] of brush) {
    cells[
      indexOf(
        centerColumn + columnOffset,
        centerRow + rowOffset,
        automaton.columns,
        automaton.rows,
      )
    ] = 1;
  }
  return { ...automaton, cells };
}

export function clearAutomaton(automaton: Automaton): Automaton {
  return {
    ...automaton,
    cells: new Uint8Array(automaton.cells.length),
    previous: automaton.cells,
    generation: 0,
  };
}

export function countLivingCells(automaton: Automaton) {
  let count = 0;
  for (const cell of automaton.cells) count += cell;
  return count;
}
