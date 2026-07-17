import assert from "node:assert/strict";
import test from "node:test";
import {
  selectMissileDestinations,
  stepFlock,
  type Boid,
  type MissileDestination,
} from "./index.ts";

const countries: MissileDestination[] = Array.from({ length: 25 }, (_, index) => ({
  id: `C${index}`,
  name: `Country ${index}`,
  longitude: index,
  latitude: index,
}));

test("a launch assigns twenty distinct destinations and excludes its source country", () => {
  const targets = selectMissileDestinations(countries, "C3", 20, () => 0.4);

  assert.equal(targets.length, 20);
  assert.equal(targets.some((target) => target.id === "C3"), false);
  assert.equal(new Set(targets.map((target) => target.id)).size, 20);
});

test("immigrants turn away from a launch origin", () => {
  const flock: Boid[] = [{ id: 0, x: 160, y: 250, vx: 20, vy: 0 }];
  const [nextBoid] = stepFlock(
    flock,
    600,
    500,
    0.5,
    { separation: 1.15, alignment: 0.82, cohesion: 0.72 },
    [{ x: 100, y: 250 }],
  );

  assert.ok(nextBoid.x > flock[0].x);
  assert.ok(nextBoid.vx > flock[0].vx);
});
