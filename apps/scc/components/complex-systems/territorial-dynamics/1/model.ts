export type Relation = "allied" | "war" | "neutral";

export type DiplomaticEventKind = "pact" | "betrayal" | "war" | "truce";

export type DiplomaticEvent = {
  kind: DiplomaticEventKind;
  first: number;
  second: number;
  tick: number;
};

export type Nation = {
  id: string;
  name: string;
  appetite: number;
  caution: number;
  capital: number;
};

export type TerritoryWorld = {
  columns: number;
  rows: number;
  elevation: Float32Array;
  moisture: Float32Array;
  land: Uint8Array;
  owners: Int16Array;
  nations: Nation[];
  relations: Relation[][];
  rivers: number[][];
  events: DiplomaticEvent[];
  tick: number;
};

export type TerritoryStep = {
  world: TerritoryWorld;
  latestEvent: DiplomaticEvent | null;
};

const NATION_SEEDS = [
  { id: "aevren", name: "Aevren", appetite: 1.18, caution: 0.46 },
  { id: "sorl", name: "Sorl", appetite: 0.92, caution: 0.64 },
  { id: "tavik", name: "Tavik", appetite: 1.08, caution: 0.38 },
  { id: "merova", name: "Merova", appetite: 0.81, caution: 0.72 },
  { id: "kharun", name: "Kharun", appetite: 1.26, caution: 0.28 },
  { id: "nive", name: "Nive", appetite: 0.76, caution: 0.79 },
  { id: "vess", name: "Vess", appetite: 1.1, caution: 0.49 },
  { id: "olvar", name: "Olvar", appetite: 0.97, caution: 0.58 },
  { id: "dars", name: "Dars", appetite: 1.16, caution: 0.34 },
  { id: "seren", name: "Seren", appetite: 0.87, caution: 0.69 },
] as const;

const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

function unit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smooth(value: number) {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, y: number) {
  const baseX = Math.floor(x);
  const baseY = Math.floor(y);
  const localX = smooth(x - baseX);
  const localY = smooth(y - baseY);
  const top = unit(baseX * 121.7 + baseY * 471.3);
  const topRight = unit((baseX + 1) * 121.7 + baseY * 471.3);
  const bottom = unit(baseX * 121.7 + (baseY + 1) * 471.3);
  const bottomRight = unit((baseX + 1) * 121.7 + (baseY + 1) * 471.3);
  const upper = top + (topRight - top) * localX;
  const lower = bottom + (bottomRight - bottom) * localX;
  return upper + (lower - upper) * localY;
}

function fractalNoise(x: number, y: number) {
  return (
    valueNoise(x * 1.3, y * 1.3) * 0.52 +
    valueNoise(x * 3.8 + 19, y * 3.8 - 7) * 0.29 +
    valueNoise(x * 9.1 - 29, y * 9.1 + 11) * 0.19
  );
}

function continent(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number) {
  const distance = Math.sqrt(
    ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2,
  );
  return 1 - distance;
}

function terrainAt(x: number, y: number) {
  const continental = Math.max(
    continent(x, y, -0.57, -0.13, 0.35, 0.48),
    continent(x, y, -0.24, 0.12, 0.42, 0.33),
    continent(x, y, 0.12, -0.21, 0.34, 0.49),
    continent(x, y, 0.47, 0.13, 0.37, 0.43),
    continent(x, y, 0.74, -0.36, 0.19, 0.24),
    continent(x, y, 0.62, 0.48, 0.22, 0.2),
  );
  const grain = fractalNoise(x + 3.7, y - 8.1) - 0.5;
  const ridge = Math.abs(fractalNoise(x * 1.9 - 12, y * 1.9 + 3) - 0.5);
  const elevation = clamp(continental * 0.76 + grain * 0.43 - ridge * 0.14 + 0.37, 0, 1);
  const moisture = clamp(
    fractalNoise(x - 18.3, y + 6.9) * 0.76 + (1 - Math.abs(y)) * 0.24,
    0,
    1,
  );
  return { elevation, moisture };
}

function indexAt(column: number, row: number, columns: number) {
  return row * columns + column;
}

function cellNeighbors(index: number, columns: number, rows: number) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const neighbors: number[] = [];
  for (const [columnOffset, rowOffset] of NEIGHBOR_OFFSETS) {
    const nextColumn = column + columnOffset;
    const nextRow = row + rowOffset;
    if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
    neighbors.push(indexAt(nextColumn, nextRow, columns));
  }
  return neighbors;
}

function findCapitals(land: Uint8Array, columns: number, rows: number) {
  const capitals: number[] = [];
  const minimumDistance = Math.max(7, Math.floor(Math.min(columns, rows) * 0.13));
  const candidates = Array.from({ length: columns * rows }, (_, index) => index)
    .filter((index) => land[index] === 1)
    .sort((first, second) => unit(second * 8.33) - unit(first * 8.33));

  for (const candidate of candidates) {
    const candidateColumn = candidate % columns;
    const candidateRow = Math.floor(candidate / columns);
    if (
      capitals.every((capital) => {
        const capitalColumn = capital % columns;
        const capitalRow = Math.floor(capital / columns);
        return Math.hypot(candidateColumn - capitalColumn, candidateRow - capitalRow) >= minimumDistance;
      })
    ) {
      capitals.push(candidate);
    }
    if (capitals.length === NATION_SEEDS.length) return capitals;
  }

  return candidates.slice(0, NATION_SEEDS.length);
}

function createRivers(
  elevation: Float32Array,
  land: Uint8Array,
  columns: number,
  rows: number,
) {
  const candidates = Array.from({ length: elevation.length }, (_, index) => index)
    .filter((index) => land[index] === 1 && elevation[index] > 0.73)
    .sort((first, second) => elevation[second] - elevation[first]);
  const rivers: number[][] = [];
  const usedSources = new Set<number>();

  for (const source of candidates) {
    if (rivers.length >= 18) break;
    if (usedSources.has(source)) continue;
    const route = [source];
    const visited = new Set(route);
    let current = source;

    for (let step = 0; step < Math.max(columns, rows); step += 1) {
      const next = cellNeighbors(current, columns, rows)
        .filter((index) => !visited.has(index))
        .sort((first, second) => elevation[first] - elevation[second])[0];
      if (next === undefined || elevation[next] >= elevation[current] - 0.003) break;
      route.push(next);
      visited.add(next);
      current = next;
      if (land[current] === 0) break;
    }

    if (route.length < 9 || land[route.at(-1) ?? source] === 1) continue;
    rivers.push(route);
    usedSources.add(source);
  }

  return rivers;
}

function relationKey(first: number, second: number) {
  return first < second ? [first, second] : [second, first];
}

function setRelation(relations: Relation[][], first: number, second: number, relation: Relation) {
  relations[first][second] = relation;
  relations[second][first] = relation;
}

function borderPairs(world: TerritoryWorld) {
  const borders = new Map<string, number>();
  const { columns, rows, owners } = world;
  for (let index = 0; index < owners.length; index += 1) {
    const owner = owners[index];
    if (owner < 0) continue;
    const column = index % columns;
    const row = Math.floor(index / columns);
    for (const [columnOffset, rowOffset] of [[1, 0], [0, 1]] as const) {
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn >= columns || nextRow >= rows) continue;
      const other = owners[indexAt(nextColumn, nextRow, columns)];
      if (other < 0 || other === owner) continue;
      const [first, second] = relationKey(owner, other);
      const key = `${first}:${second}`;
      borders.set(key, (borders.get(key) ?? 0) + 1);
    }
  }
  return borders;
}

function updateDiplomacy(world: TerritoryWorld) {
  const borders = borderPairs(world);
  const relations = world.relations.map((row) => [...row]);
  const events: DiplomaticEvent[] = [];

  for (const [key, pressure] of borders) {
    const [first, second] = key.split(":").map(Number);
    const current = relations[first][second];
    const temper = unit(world.tick * 3.71 + first * 19.2 + second * 47.6);
    const caution = (world.nations[first].caution + world.nations[second].caution) * 0.5;
    const frontier = clamp(pressure / Math.max(world.columns, world.rows), 0, 1);

    if (current === "war" && temper < 0.18 + caution * 0.15) {
      setRelation(relations, first, second, "neutral");
      events.push({ kind: "truce", first, second, tick: world.tick });
      continue;
    }

    if (current === "allied" && temper < 0.12 + frontier * 0.16) {
      setRelation(relations, first, second, "war");
      events.push({ kind: "betrayal", first, second, tick: world.tick });
      continue;
    }

    if (current === "neutral") {
      if (temper < 0.22 + caution * 0.2) {
        setRelation(relations, first, second, "allied");
        events.push({ kind: "pact", first, second, tick: world.tick });
      } else if (temper > 0.79 - frontier * 0.14) {
        setRelation(relations, first, second, "war");
        events.push({ kind: "war", first, second, tick: world.tick });
      }
    }
  }

  return { relations, events };
}

export function createTerritoryWorld(columns: number, rows: number): TerritoryWorld {
  const size = columns * rows;
  const elevation = new Float32Array(size);
  const moisture = new Float32Array(size);
  const land = new Uint8Array(size);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = indexAt(column, row, columns);
      const x = (column / Math.max(1, columns - 1)) * 2 - 1;
      const y = (row / Math.max(1, rows - 1)) * 2 - 1;
      const terrain = terrainAt(x, y);
      elevation[index] = terrain.elevation;
      moisture[index] = terrain.moisture;
      land[index] = terrain.elevation > 0.5 ? 1 : 0;
    }
  }

  const capitals = findCapitals(land, columns, rows);
  const nations = NATION_SEEDS.map((seed, index) => ({ ...seed, capital: capitals[index] }));
  const owners = new Int16Array(size).fill(-1);
  for (let nationIndex = 0; nationIndex < nations.length; nationIndex += 1) {
    const capital = nations[nationIndex].capital;
    if (capital === undefined) continue;
    owners[capital] = nationIndex;
    for (const neighbor of cellNeighbors(capital, columns, rows)) {
      if (land[neighbor] === 1 && unit(neighbor * 12.8 + nationIndex) > 0.28) {
        owners[neighbor] = nationIndex;
      }
    }
  }

  const relations = Array.from({ length: nations.length }, (_, row) =>
    Array.from({ length: nations.length }, (_, column) =>
      row === column ? "allied" : "neutral",
    ) as Relation[],
  );

  return {
    columns,
    rows,
    elevation,
    moisture,
    land,
    owners,
    nations,
    relations,
    rivers: createRivers(elevation, land, columns, rows),
    events: [],
    tick: 0,
  };
}

export function advanceTerritoryWorld(world: TerritoryWorld): TerritoryStep {
  const tick = world.tick + 1;
  const nextOwners = new Int16Array(world.owners);
  const territory = countTerritory(world);

  for (let index = 0; index < world.owners.length; index += 1) {
    if (world.land[index] === 0) continue;
    const owner = world.owners[index];
    const nearby = cellNeighbors(index, world.columns, world.rows)
      .map((neighbor) => world.owners[neighbor])
      .filter((neighborOwner) => neighborOwner >= 0);
    if (nearby.length === 0) continue;

    if (owner < 0) {
      const influence = new Map<number, number>();
      for (const neighborOwner of nearby) {
        influence.set(neighborOwner, (influence.get(neighborOwner) ?? 0) + 1);
      }
      const candidates = Array.from(influence.keys()).sort(
        (first, second) =>
          (influence.get(second) ?? 0) * world.nations[second].appetite -
          (influence.get(first) ?? 0) * world.nations[first].appetite,
      );
      const candidate = candidates[0];
      if (candidate === undefined) continue;
      const chance = clamp(
        0.075 + (influence.get(candidate) ?? 0) * 0.054 * world.nations[candidate].appetite,
        0,
        0.42,
      );
      if (unit(index * 7.17 + tick * 11.9) < chance) nextOwners[index] = candidate;
      continue;
    }

    const rivals = nearby.filter(
      (neighborOwner) =>
        neighborOwner !== owner && world.relations[owner][neighborOwner] === "war",
    );
    if (rivals.length === 0 || territory[owner] < 10) continue;
    const challenger = rivals[Math.floor(unit(index * 2.39 + tick * 5.17) * rivals.length)];
    if (challenger === undefined || territory[challenger] < 10) continue;
    const force =
      (world.nations[challenger].appetite * 0.71 + unit(tick * 3.3 + index) * 0.69) /
      (world.nations[owner].caution * 0.47 + 0.84);
    if (force > 0.93 && unit(index * 19.1 + tick * 2.7) > 0.32) {
      nextOwners[index] = challenger;
    }
  }

  let relations = world.relations;
  let newEvents: DiplomaticEvent[] = [];
  if (tick % 24 === 0) {
    const diplomacy = updateDiplomacy({ ...world, owners: nextOwners, tick });
    relations = diplomacy.relations;
    newEvents = diplomacy.events.slice(-2);
  }

  const events = [...world.events, ...newEvents].slice(-6);
  return {
    world: { ...world, owners: nextOwners, relations, events, tick },
    latestEvent: newEvents.at(-1) ?? null,
  };
}

export function countTerritory(world: TerritoryWorld) {
  const counts = Array.from({ length: world.nations.length }, () => 0);
  for (const owner of world.owners) {
    if (owner >= 0) counts[owner] += 1;
  }
  return counts;
}

export function territoryCenter(world: TerritoryWorld, nationIndex: number) {
  let x = 0;
  let y = 0;
  let count = 0;
  for (let index = 0; index < world.owners.length; index += 1) {
    if (world.owners[index] !== nationIndex) continue;
    x += index % world.columns;
    y += Math.floor(index / world.columns);
    count += 1;
  }
  if (count === 0) return null;
  return { x: x / count, y: y / count };
}

export function relationPairs(world: TerritoryWorld, relation: Relation) {
  const pairs: Array<[number, number]> = [];
  for (let first = 0; first < world.nations.length; first += 1) {
    for (let second = first + 1; second < world.nations.length; second += 1) {
      if (world.relations[first][second] === relation) pairs.push([first, second]);
    }
  }
  return pairs;
}
