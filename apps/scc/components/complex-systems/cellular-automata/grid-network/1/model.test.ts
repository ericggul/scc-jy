import assert from "node:assert/strict";
import test from "node:test";
import {
  GRID_NETWORK_COLUMNS,
  GRID_NETWORK_ROWS,
  createGridNetwork,
  createGridNetworkAutomaton,
  gridNetworkEdgeId,
  gridNetworkStatesDiffer,
  setGridNetworkBackgroundState,
  stepGridNetworkBackground,
  stepGridNetworkBorder,
  toneForState,
  type GridNetworkAutomaton,
} from "./model.ts";

function blankAutomaton(columns = 3, rows = 3): GridNetworkAutomaton {
  const automaton = createGridNetworkAutomaton(columns, rows);
  return {
    ...automaton,
    backgroundStates: new Uint8Array(columns * rows),
    borderStates: new Uint8Array(columns * rows),
  };
}

test("the default field has 576 cells and 2,162 local edges", () => {
  const network = createGridNetwork();

  assert.equal(network.columns, GRID_NETWORK_COLUMNS);
  assert.equal(network.rows, GRID_NETWORK_ROWS);
  assert.equal(network.cells.length, 576);
  assert.equal(network.edges.length, 2162);

  let diagonalEdges = 0;
  for (const edge of network.edges) {
    const columnDistance = Math.abs(edge.from.column - edge.to.column);
    const rowDistance = Math.abs(edge.from.row - edge.to.row);
    assert.ok(columnDistance <= 1 && rowDistance <= 1);
    assert.ok(columnDistance + rowDistance > 0);
    if (columnDistance === 1 && rowDistance === 1) diagonalEdges += 1;
  }
  assert.equal(diagonalEdges, 1058);
});

test("a line exists only across different states in its own cellular layer", () => {
  const automaton = blankAutomaton(2, 2);
  automaton.backgroundStates[0] = 1;
  automaton.borderStates[3] = 1;

  assert.equal(
    gridNetworkStatesDiffer(automaton.backgroundStates, automaton.network, 0, 0, 1, 0),
    true,
  );
  assert.equal(
    gridNetworkStatesDiffer(automaton.backgroundStates, automaton.network, 0, 1, 1, 1),
    false,
  );
  assert.equal(
    gridNetworkStatesDiffer(automaton.borderStates, automaton.network, 0, 0, 1, 1),
    true,
  );
  assert.equal(
    gridNetworkStatesDiffer(automaton.borderStates, automaton.network, 0, 0, 1, 0),
    false,
  );
});

test("background CA uses only the four cardinal neighbours", () => {
  let automaton = blankAutomaton();
  automaton = setGridNetworkBackgroundState(automaton, 0, 1, 1);
  automaton = setGridNetworkBackgroundState(automaton, 2, 1, 1);

  assert.equal(stepGridNetworkBackground(automaton).backgroundStates[4], 1);

  let diagonalOnly = blankAutomaton();
  diagonalOnly = setGridNetworkBackgroundState(diagonalOnly, 0, 0, 1);
  diagonalOnly = setGridNetworkBackgroundState(diagonalOnly, 2, 0, 1);
  diagonalOnly = setGridNetworkBackgroundState(diagonalOnly, 0, 2, 1);

  assert.equal(stepGridNetworkBackground(diagonalOnly).backgroundStates[4], 0);
});

test("only cardinal lines that counterfactually cause a background transition are active", () => {
  let automaton = blankAutomaton();
  automaton = setGridNetworkBackgroundState(automaton, 0, 1, 1);
  automaton = setGridNetworkBackgroundState(automaton, 2, 1, 1);

  const stepped = stepGridNetworkBackground(automaton);

  assert.equal(stepped.backgroundStates[4], 1);
  assert.ok(stepped.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 0, 1)));
  assert.ok(stepped.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 2, 1)));
  assert.equal(
    stepped.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(0, 0, 1, 1)),
    false,
  );
});

test("border CA uses only the four diagonal neighbours", () => {
  const diagonalAutomaton = blankAutomaton();
  diagonalAutomaton.borderStates[0] = 1;
  diagonalAutomaton.borderStates[8] = 1;

  assert.equal(stepGridNetworkBorder(diagonalAutomaton).borderStates[4], 1);

  const cardinalAutomaton = blankAutomaton();
  cardinalAutomaton.borderStates[1] = 1;
  cardinalAutomaton.borderStates[3] = 1;
  cardinalAutomaton.borderStates[5] = 1;

  assert.equal(stepGridNetworkBorder(cardinalAutomaton).borderStates[4], 0);
});

test("only diagonal lines that counterfactually cause a border transition are active", () => {
  const automaton = blankAutomaton();
  automaton.borderStates[0] = 1;
  automaton.borderStates[8] = 1;

  const stepped = stepGridNetworkBorder(automaton);

  assert.equal(stepped.borderStates[4], 1);
  assert.ok(stepped.borderInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 0, 0)));
  assert.ok(stepped.borderInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 2, 2)));
  assert.equal(
    stepped.borderInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 2, 1)),
    false,
  );
});

test("each stalled layer receives a deterministic local spark", () => {
  let automaton = blankAutomaton(5, 5);
  for (let index = 0; index < 12; index += 1) {
    automaton = stepGridNetworkBackground(automaton);
  }
  assert.ok(automaton.backgroundStates.some((state) => state === 1));
  assert.equal(automaton.backgroundInfluencedEdgeIds.size, 0);
});

test("a manual intervention changes only the background layer and clears stale line state", () => {
  let automaton = blankAutomaton(3, 1);
  automaton = setGridNetworkBackgroundState(automaton, 0, 0, 1);
  automaton = setGridNetworkBackgroundState(automaton, 2, 0, 1);
  automaton = stepGridNetworkBackground(automaton);
  automaton = setGridNetworkBackgroundState(automaton, 0, 0, 1);

  assert.equal(toneForState(automaton.backgroundStates[0]! as 0 | 1), "black");
  assert.equal(toneForState(automaton.borderStates[0]! as 0 | 1), "white");
  assert.equal(automaton.backgroundInfluencedEdgeIds.size, 0);
});
