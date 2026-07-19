import assert from "node:assert/strict";
import test from "node:test";
import {
  createCursorField,
  createGrid,
  getCellAtPoint,
  settleCursorField,
  stepCursorField,
  SWARM_FOUR_SETTINGS,
} from "./index.ts";

function headingChange(
  previous: { vx: number; vy: number },
  next: { vx: number; vy: number },
) {
  const previousHeading = Math.atan2(previous.vy, previous.vx);
  const nextHeading = Math.atan2(next.vy, next.vx);
  return Math.abs(
    Math.atan2(
      Math.sin(nextHeading - previousHeading),
      Math.cos(nextHeading - previousHeading),
    ),
  );
}

test("side-view fish steer continuously while remaining outside selected cells", () => {
  const width = 1200;
  const height = 800;
  const grid = createGrid(width, height, SWARM_FOUR_SETTINGS);
  const selectedCells = [
    getCellAtPoint(width * 0.3, height * 0.34, grid),
    getCellAtPoint(width * 0.68, height * 0.62, grid),
  ];
  let fish = createCursorField(
    200,
    width,
    height,
    SWARM_FOUR_SETTINGS,
    "sideFish",
  );
  fish = settleCursorField(
    fish,
    width,
    height,
    selectedCells,
    SWARM_FOUR_SETTINGS,
    false,
  );
  let maximumTurn = 0;

  for (let frame = 0; frame < 480; frame += 1) {
    const previousFish = fish;
    fish = stepCursorField(
      fish,
      width,
      height,
      1 / 60,
      frame / 60,
      selectedCells,
      SWARM_FOUR_SETTINGS,
      false,
      1,
      "sideFish",
    );

    for (let index = 0; index < fish.length; index += 1) {
      maximumTurn = Math.max(
        maximumTurn,
        headingChange(previousFish[index], fish[index]),
      );
    }
  }

  assert.ok(maximumTurn <= 1.4 / 60 + 0.001);
  assert.equal(
    fish.every((currentFish) =>
      selectedCells.every(
        (cell) =>
          !(
            currentFish.x > cell.x - SWARM_FOUR_SETTINGS.clearance &&
            currentFish.x < cell.x + cell.width + SWARM_FOUR_SETTINGS.clearance &&
            currentFish.y > cell.y - SWARM_FOUR_SETTINGS.clearance &&
            currentFish.y < cell.y + cell.height + SWARM_FOUR_SETTINGS.clearance
          ),
      ),
    ),
    true,
  );
});
