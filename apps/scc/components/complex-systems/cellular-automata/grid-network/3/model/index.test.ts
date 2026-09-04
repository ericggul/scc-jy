import assert from "node:assert/strict";
import test from "node:test";
import {
  GRID_NETWORK_COLUMNS,
  GRID_NETWORK_DEPTH,
  GRID_NETWORK_ROWS,
  createGridNetwork,
  createGridNetworkAutomaton,
  setGridNetworkBackgroundState,
  stepGridNetworkBackground,
  stepGridNetworkBorder,
  type GridNetworkAutomaton,
} from "./index.ts";

function indexOf(
  column: number,
  row: number,
  depth: number,
  columns: number,
  rows: number,
) {
  return depth * rows * columns + row * columns + column;
}

function blankAutomaton(
  columns = 3,
  rows = 3,
  depth = 3,
): GridNetworkAutomaton {
  const automaton = createGridNetworkAutomaton(columns, rows, depth);
  return {
    ...automaton,
    backgroundStates: new Uint8Array(columns * rows * depth),
    borderStates: new Uint8Array(columns * rows * depth),
  };
}

test("the default volume has 512 cells, 1,344 cardinal edges, and 2,352 diagonal edges", () => {
  const network = createGridNetwork();

  assert.equal(network.columns, GRID_NETWORK_COLUMNS);
  assert.equal(network.rows, GRID_NETWORK_ROWS);
  assert.equal(network.depth, GRID_NETWORK_DEPTH);
  assert.equal(network.cells.length, 512);
  assert.equal(network.cardinalEdges.length, 1344);
  assert.equal(network.diagonalEdges.length, 2352);

  for (const edge of network.cardinalEdges) {
    const distance = Math.abs(edge.from.column - edge.to.column)
      + Math.abs(edge.from.row - edge.to.row)
      + Math.abs(edge.from.depth - edge.to.depth);
    assert.equal(distance, 1);
  }

  for (const edge of network.diagonalEdges) {
    const distance = Math.abs(edge.from.column - edge.to.column)
      + Math.abs(edge.from.row - edge.to.row)
      + Math.abs(edge.from.depth - edge.to.depth);
    assert.equal(distance, 2);
  }
});

test("the background CA uses only its six face neighbours", () => {
  let automaton = blankAutomaton();
  for (const [column, row, depth] of [
    [0, 1, 1],
    [2, 1, 1],
    [1, 0, 1],
  ] as const) {
    automaton = setGridNetworkBackgroundState(
      automaton,
      indexOf(column, row, depth, 3, 3),
      1,
    );
  }

  assert.equal(
    stepGridNetworkBackground(automaton).backgroundStates[indexOf(1, 1, 1, 3, 3)],
    1,
  );

  let diagonalOnly = blankAutomaton();
  for (const [column, row, depth] of [
    [0, 0, 1],
    [2, 0, 1],
    [0, 2, 1],
  ] as const) {
    diagonalOnly = setGridNetworkBackgroundState(
      diagonalOnly,
      indexOf(column, row, depth, 3, 3),
      1,
    );
  }

  assert.equal(
    stepGridNetworkBackground(diagonalOnly).backgroundStates[indexOf(1, 1, 1, 3, 3)],
    0,
  );
});

test("the border CA uses only its twelve edge-diagonal neighbours", () => {
  const diagonalAutomaton = blankAutomaton();
  for (const [column, row, depth] of [
    [0, 0, 1],
    [2, 0, 1],
    [0, 2, 1],
    [2, 2, 1],
    [2, 1, 2],
  ] as const) {
    diagonalAutomaton.borderStates[indexOf(column, row, depth, 3, 3)] = 1;
  }

  assert.equal(
    stepGridNetworkBorder(diagonalAutomaton).borderStates[indexOf(1, 1, 1, 3, 3)],
    1,
  );

  const cardinalAutomaton = blankAutomaton();
  for (const [column, row, depth] of [
    [0, 1, 1],
    [2, 1, 1],
    [1, 0, 1],
    [1, 2, 1],
    [1, 1, 0],
  ] as const) {
    cardinalAutomaton.borderStates[indexOf(column, row, depth, 3, 3)] = 1;
  }

  assert.equal(
    stepGridNetworkBorder(cardinalAutomaton).borderStates[indexOf(1, 1, 1, 3, 3)],
    0,
  );
});

test("the active cardinal edges are only the living neighbours that cause a transition", () => {
  let automaton = blankAutomaton();
  for (const [column, row, depth] of [
    [0, 1, 1],
    [2, 1, 1],
    [1, 0, 1],
  ] as const) {
    automaton = setGridNetworkBackgroundState(
      automaton,
      indexOf(column, row, depth, 3, 3),
      1,
    );
  }

  const stepped = stepGridNetworkBackground(automaton);
  const center = stepped.network.cells[indexOf(1, 1, 1, 3, 3)]!;
  const causalEdge = stepped.network.cardinalEdges.find((edge) => (
    (edge.from.index === center.index && edge.to.index === indexOf(0, 1, 1, 3, 3))
    || (edge.to.index === center.index && edge.from.index === indexOf(0, 1, 1, 3, 3))
  ));

  assert.ok(causalEdge);
  assert.ok(stepped.backgroundInfluencedEdgeIds.has(causalEdge.id));
});

test("each underactive layer immediately receives a bounded three-dimensional spark", () => {
  let automaton = blankAutomaton(4, 4, 4);
  const before = new Uint8Array(automaton.backgroundStates);
  automaton = stepGridNetworkBackground(automaton);

  assert.ok(automaton.backgroundStates.some((state) => state === 1));
  assert.ok(automaton.backgroundStates.some((state, index) => state !== before[index]));
});

test("a manual intervention changes only the background volume", () => {
  let automaton = blankAutomaton();
  automaton = setGridNetworkBackgroundState(automaton, indexOf(1, 1, 1, 3, 3), 1);

  assert.equal(automaton.backgroundStates[indexOf(1, 1, 1, 3, 3)], 1);
  assert.equal(automaton.borderStates[indexOf(1, 1, 1, 3, 3)], 0);
  assert.equal(automaton.backgroundInfluencedEdgeIds.size, 0);
});
