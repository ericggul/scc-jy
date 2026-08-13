export const TOPICS = [
  { id: "housing", label: "housing" },
  { id: "care", label: "care" },
  { id: "energy", label: "energy" },
  { id: "mobility", label: "mobility" },
] as const;

export type TopicId = (typeof TOPICS)[number]["id"];
export type Faction = "blue" | "white" | "quiet";

export type OpinionCell = {
  faction: Faction;
  topic: TopicId;
  conviction: number;
  age: number;
};

export type OpinionEcosystem = {
  columns: number;
  rows: number;
  cells: readonly OpinionCell[];
  previousCells: readonly OpinionCell[];
  randomState: number;
  generation: number;
};

export type PollSummary = {
  blue: number;
  white: number;
  quiet: number;
};

export type PollPhase = "gathering" | "surge" | "attrition";

const TOPIC_CYCLE = 180;

const QUIET_CELL: OpinionCell = {
  faction: "quiet",
  topic: "housing",
  conviction: 0,
  age: 0,
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function nextRandom(state: number): [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned || 0x9e3779b9, unsigned / 0x1_0000_0000];
}

function indexOf(column: number, row: number, columns: number, rows: number) {
  const wrappedColumn = (column + columns) % columns;
  const wrappedRow = (row + rows) % rows;
  return wrappedRow * columns + wrappedColumn;
}

function topicAt(generation: number) {
  return TOPICS[Math.floor(generation / TOPIC_CYCLE) % TOPICS.length];
}

function topicIndex(topic: TopicId) {
  return TOPICS.findIndex((candidate) => candidate.id === topic);
}

function factionOpposite(faction: Exclude<Faction, "quiet">) {
  return faction === "blue" ? "white" : "blue";
}

function topicWithMostNeighbours(
  cells: readonly OpinionCell[],
  neighbours: readonly number[],
  currentTopic: TopicId,
  random: number,
) {
  const scores = new Map<TopicId, number>(TOPICS.map((topic) => [topic.id, 0]));
  for (const neighbour of neighbours) {
    const cell = cells[neighbour];
    if (cell.faction === "quiet") continue;
    scores.set(cell.topic, (scores.get(cell.topic) ?? 0) + 1);
  }
  scores.set(currentTopic, (scores.get(currentTopic) ?? 0) + 0.7);
  return TOPICS.slice().sort((first, second) => {
    const difference = (scores.get(second.id) ?? 0) - (scores.get(first.id) ?? 0);
    if (difference !== 0) return difference;
    return (topicIndex(first.id) + random) % TOPICS.length -
      (topicIndex(second.id) + random) % TOPICS.length;
  })[0]?.id ?? currentTopic;
}

function neighboursFor(
  index: number,
  columns: number,
  rows: number,
) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const neighbours: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (columnOffset === 0 && rowOffset === 0) continue;
      neighbours.push(indexOf(column + columnOffset, row + rowOffset, columns, rows));
    }
  }
  return neighbours;
}

export function currentTopic(generation: number) {
  return topicAt(generation);
}

export function currentPollPhase(generation: number): PollPhase {
  const position = (generation % TOPIC_CYCLE) / TOPIC_CYCLE;
  if (position < 0.23) return "gathering";
  if (position < 0.67) return "surge";
  return "attrition";
}

export function createOpinionEcosystem(
  columns: number,
  rows: number,
  seed = 0x4f5a6d73,
): OpinionEcosystem {
  let randomState = seed >>> 0 || 1;
  const cells: OpinionCell[] = [];

  for (let index = 0; index < columns * rows; index += 1) {
    let presence: number;
    let faction: number;
    let topic: number;
    let conviction: number;
    [randomState, presence] = nextRandom(randomState);
    [randomState, faction] = nextRandom(randomState);
    [randomState, topic] = nextRandom(randomState);
    [randomState, conviction] = nextRandom(randomState);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cluster = Math.sin(column * 0.43 + row * 0.21) + Math.cos(column * 0.12 - row * 0.37);
    const occupied = presence + cluster * 0.1 > 0.49;
    cells.push(
      occupied
        ? {
            faction: faction < 0.5 ? "blue" : "white",
            topic: TOPICS[Math.min(TOPICS.length - 1, Math.floor(topic * TOPICS.length))].id,
            conviction: 0.32 + conviction * 0.55,
            age: Math.floor(conviction * 26),
          }
        : { ...QUIET_CELL },
    );
  }

  return {
    columns,
    rows,
    cells,
    previousCells: cells,
    randomState,
    generation: 0,
  };
}

export function summarizeOpinionEcosystem(
  ecosystem: OpinionEcosystem,
): PollSummary {
  return ecosystem.cells.reduce<PollSummary>(
    (summary, cell) => {
      summary[cell.faction] += 1;
      return summary;
    },
    { blue: 0, white: 0, quiet: 0 },
  );
}

export function stepOpinionEcosystem(
  ecosystem: OpinionEcosystem,
): OpinionEcosystem {
  const generation = ecosystem.generation + 1;
  const topic = topicAt(generation);
  const phase = currentPollPhase(generation);
  const cyclePosition = (generation % TOPIC_CYCLE) / TOPIC_CYCLE;
  const risingAttention = Math.sin(Math.min(1, cyclePosition / 0.67) * Math.PI / 2);
  const attrition = phase === "attrition"
    ? (cyclePosition - 0.67) / 0.33
    : 0;
  const favouredFaction: Exclude<Faction, "quiet"> =
    Math.floor(generation / TOPIC_CYCLE) % 2 === 0
      ? "blue"
      : "white";
  let randomState = ecosystem.randomState;

  let cells: OpinionCell[] = ecosystem.cells.map((cell, index): OpinionCell => {
    let first: number;
    let second: number;
    let third: number;
    let fourth: number;
    [randomState, first] = nextRandom(randomState);
    [randomState, second] = nextRandom(randomState);
    [randomState, third] = nextRandom(randomState);
    [randomState, fourth] = nextRandom(randomState);
    const neighbours = neighboursFor(index, ecosystem.columns, ecosystem.rows);
    let blue = 0;
    let white = 0;
    let active = 0;
    for (const neighbourIndex of neighbours) {
      const neighbour = ecosystem.cells[neighbourIndex];
      if (neighbour.faction === "blue") blue += 1;
      if (neighbour.faction === "white") white += 1;
      if (neighbour.faction !== "quiet") active += 1;
    }

    if (cell.faction === "quiet") {
      if (phase === "gathering" && first < 0.012) {
        return {
          faction: favouredFaction,
          topic: topic.id,
          conviction: 0.36 + third * 0.2,
          age: 0,
        };
      }
      const dominant: Exclude<Faction, "quiet"> = blue === white
        ? favouredFaction
        : blue > white ? "blue" : "white";
      const support = dominant === "blue" ? blue : white;
      const density = Math.min(1, support / 4);
      const gatheringBonus = phase === "gathering" ? 0.012 : 0;
      const birthChance = active >= 2 && support >= 2
        ? (0.006 + risingAttention * 0.037 + gatheringBonus) * density
        : 0;
      if (first < birthChance) {
        return {
          faction: dominant,
          topic: topicWithMostNeighbours(ecosystem.cells, neighbours, topic.id, second),
          conviction: 0.32 + third * 0.28,
          age: 0,
        };
      }
      return { ...QUIET_CELL };
    }

    const opponent = factionOpposite(cell.faction);
    const alliedNeighbours = cell.faction === "blue" ? blue : white;
    const opposingNeighbours = cell.faction === "blue" ? white : blue;
    const topicFit = cell.topic === topic.id ? 1 : 0;
    const isolation = alliedNeighbours === 0 ? 1 : 0;
    const crowding = Math.max(0, alliedNeighbours - 5) / 3;
    const fatigue = clamp((cell.age - 58) / 160);
    const reconsiderationChance =
      phase === "gathering" && cell.faction !== favouredFaction
        ? (cell.topic === topic.id ? 0.019 : 0.006) * (1 - cell.conviction)
        : 0;
    if (fourth < reconsiderationChance) {
      return {
        faction: favouredFaction,
        topic: topic.id,
        conviction: 0.3 + third * 0.22,
        age: 0,
      };
    }
    const fadeChance =
      0.0015 +
      isolation * 0.03 +
      crowding * 0.008 +
      fatigue * 0.006 +
      attrition * (0.009 + topicFit * 0.018) +
      (cell.faction === favouredFaction ? 0 : attrition * 0.016);
    if (first < fadeChance) return { ...QUIET_CELL };

    const pressure = Math.max(0, opposingNeighbours - alliedNeighbours - 1);
    const switchChance = pressure > 0 && cell.conviction < 0.73
      ? 0.003 + pressure * 0.008 + attrition * topicFit * 0.006
      : 0;
    if (second < switchChance) {
      return {
        faction: opponent,
        topic: topicWithMostNeighbours(ecosystem.cells, neighbours, topic.id, third),
        conviction: 0.28 + fourth * 0.2,
        age: 0,
      };
    }

    const convictionTarget = clamp(
      0.28 + alliedNeighbours * 0.095 - opposingNeighbours * 0.058 +
        topicFit * risingAttention * 0.22 - attrition * 0.14,
    );
    const mutationChance = 0.0018 + (topicFit ? 0 : risingAttention * 0.003);
    return {
      faction: cell.faction,
      topic: third < mutationChance
        ? topicWithMostNeighbours(ecosystem.cells, neighbours, topic.id, fourth)
        : cell.topic,
      conviction: clamp(cell.conviction + (convictionTarget - cell.conviction) * 0.14),
      age: cell.age + 1,
    };
  });

  if (phase === "gathering" && generation % 5 === 0) {
    for (let emergence = 0; emergence < 4; emergence += 1) {
      let center: number;
      [randomState, center] = nextRandom(randomState);
      const middle = Math.min(cells.length - 1, Math.floor(center * cells.length));
      const centerColumn = middle % ecosystem.columns;
      const centerRow = Math.floor(middle / ecosystem.columns);
      for (const [columnOffset, rowOffset] of [
        [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1],
      ]) {
        cells[indexOf(
          centerColumn + columnOffset,
          centerRow + rowOffset,
          ecosystem.columns,
          ecosystem.rows,
        )] = {
          faction: favouredFaction,
          topic: topic.id,
          conviction: 0.76,
          age: 0,
        };
      }
    }
  }

  return {
    ...ecosystem,
    cells,
    previousCells: ecosystem.cells,
    randomState,
    generation,
  };
}

export function seedOpinionPatch(
  ecosystem: OpinionEcosystem,
  column: number,
  row: number,
  faction: Exclude<Faction, "quiet">,
): OpinionEcosystem {
  const topic = topicAt(ecosystem.generation).id;
  const cells = [...ecosystem.cells];
  const brush = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
  ];
  for (const [columnOffset, rowOffset] of brush) {
    cells[indexOf(
      column + columnOffset,
      row + rowOffset,
      ecosystem.columns,
      ecosystem.rows,
    )] = {
      faction,
      topic,
      conviction: 0.82,
      age: 0,
    };
  }
  return { ...ecosystem, cells };
}
