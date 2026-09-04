import assert from "node:assert/strict";
import test from "node:test";
import {
  GRID_NETWORK_COLOURS,
  GRID_NETWORK_COLUMNS,
  GRID_NETWORK_ROWS,
  colourForState,
  createGridNetwork,
  createGridNetworkAutomaton,
  gridNetworkEdgeId,
  gridNetworkStatesDiffer,
  setGridNetworkBackgroundState,
  stepGridNetworkBackground,
  stepGridNetworkBorder,
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

test("the RGB network has a 48 by 48 field and 8,930 local edges", () => {
  const network = createGridNetwork();

  assert.equal(network.columns, GRID_NETWORK_COLUMNS);
  assert.equal(network.rows, GRID_NETWORK_ROWS);
  assert.equal(network.cells.length, 2304);
  assert.equal(network.edges.length, 8930);
});

test("the seed uses exactly red, green, and blue states", () => {
  const automaton = createGridNetworkAutomaton(12, 8);
  const colours = new Set<string>();

  for (const state of automaton.backgroundStates) {
    colours.add(colourForState(state as 0 | 1 | 2));
  }

  assert.deepEqual([...colours].sort(), [...GRID_NETWORK_COLOURS].sort());
});

test("each line exists only across different states in its matching RGB layer", () => {
  const automaton = blankAutomaton(2, 2);
  automaton.backgroundStates[0] = 1;
  automaton.borderStates[3] = 2;

  assert.equal(
    gridNetworkStatesDiffer(automaton.backgroundStates, automaton.network, 0, 0, 1, 0),
    true,
  );
  assert.equal(
    gridNetworkStatesDiffer(automaton.backgroundStates, automaton.network, 1, 0, 0, 1),
    false,
  );
  assert.equal(
    gridNetworkStatesDiffer(automaton.borderStates, automaton.network, 0, 0, 1, 1),
    true,
  );
});

test("background RGB CA advances only from three cardinal successor neighbours", () => {
  let automaton = blankAutomaton();
  automaton = setGridNetworkBackgroundState(automaton, 1, 0, 1);
  automaton = setGridNetworkBackgroundState(automaton, 0, 1, 1);
  automaton = setGridNetworkBackgroundState(automaton, 2, 1, 1);

  const stepped = stepGridNetworkBackground(automaton);

  assert.equal(stepped.backgroundStates[4], 1);
  assert.ok(stepped.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 1, 0)));
  assert.ok(stepped.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 0, 1)));
  assert.ok(stepped.backgroundInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 2, 1)));

  let diagonalOnly = blankAutomaton();
  diagonalOnly = setGridNetworkBackgroundState(diagonalOnly, 0, 0, 1);
  diagonalOnly = setGridNetworkBackgroundState(diagonalOnly, 2, 0, 1);
  diagonalOnly = setGridNetworkBackgroundState(diagonalOnly, 0, 2, 1);
  assert.equal(stepGridNetworkBackground(diagonalOnly).backgroundStates[4], 0);
});

test("border RGB CA advances only from three diagonal successor neighbours", () => {
  const automaton = blankAutomaton();
  automaton.borderStates[0] = 1;
  automaton.borderStates[2] = 1;
  automaton.borderStates[6] = 1;

  const stepped = stepGridNetworkBorder(automaton);

  assert.equal(stepped.borderStates[4], 1);
  assert.ok(stepped.borderInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 0, 0)));
  assert.ok(stepped.borderInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 2, 0)));
  assert.ok(stepped.borderInfluencedEdgeIds.has(gridNetworkEdgeId(1, 1, 0, 2)));
});

test("each quiet RGB layer receives its own deterministic multi-patch spark", () => {
  let automaton = blankAutomaton(5, 5);
  for (let index = 0; index < 3; index += 1) {
    automaton = stepGridNetworkBackground(automaton);
  }
  assert.ok(automaton.backgroundStates.some((state) => state !== 0));

  let borderAutomaton = blankAutomaton(5, 5);
  for (let index = 0; index < 3; index += 1) {
    borderAutomaton = stepGridNetworkBorder(borderAutomaton);
  }
  assert.ok(borderAutomaton.borderStates.some((state) => state !== 0));
});

test("manual painting changes only the background RGB layer", () => {
  const automaton = setGridNetworkBackgroundState(blankAutomaton(2, 1), 0, 0, 2);

  assert.equal(colourForState(automaton.backgroundStates[0]! as 0 | 1 | 2), "blue");
  assert.equal(colourForState(automaton.borderStates[0]! as 0 | 1 | 2), "red");
  assert.equal(automaton.backgroundInfluencedEdgeIds.size, 0);
});
