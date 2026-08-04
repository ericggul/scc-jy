import type { LatentScoreEvent } from "./score";

export type GoldfishAgent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type ScoreAnchor = {
  system: number;
  slot: number;
  step: number;
};

export type ScoreSystem = {
  index: number;
  topLineY: number;
  bottomLineY: number;
  lineGap: number;
  left: number;
  right: number;
  noteStart: number;
  noteEnd: number;
  slotCount: number;
};

export type ScoreLayout = {
  width: number;
  height: number;
  lineGap: number;
  systems: ScoreSystem[];
};

export type ScoreNote = ScoreAnchor & {
  id: string;
  eventId: string;
  revealId: string;
  sequence: number;
  duration: LatentScoreEvent["duration"];
  x: number;
  y: number;
  pitch: string;
};

export type SchoolSettings = {
  minDistance: number;
  collisionBuffer: number;
  collisionPasses: number;
};

export const GOLDFISH_SCHOOL_SETTINGS: SchoolSettings = {
  minDistance: 16,
  collisionBuffer: 2,
  collisionPasses: 6,
};

const PERCEPTION_RADIUS = 72;
const SEPARATION_RADIUS = 24;
const MAX_SPEED = 92;
const MIN_SPEED = 34;
const EDGE_MARGIN = 48;
function seededUnit(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function limitVector(x: number, y: number, maximum: number) {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= maximum || magnitude === 0) return { x, y };
  const scale = maximum / magnitude;
  return { x: x * scale, y: y * scale };
}

export function createScoreLayout(width: number, height: number): ScoreLayout {
  const lineGap = clamp(Math.min(width / 72, height / 43), 11, 17);
  const systemPitch = lineGap * 9.5;
  const verticalMargin = Math.max(lineGap * 3.2, (height % systemPitch) / 2);
  const systemCount = clamp(
    Math.floor((height - verticalMargin * 1.3) / systemPitch),
    2,
    5,
  );
  const occupiedHeight = (systemCount - 1) * systemPitch + lineGap * 4;
  const firstTop = (height - occupiedHeight) / 2;
  const left = clamp(width * 0.055, 34, 78);
  const right = width - left;
  const noteStart = left + lineGap * 1.25;
  const noteEnd = right - lineGap * 1.25;
  const slotCount = clamp(
    Math.floor((noteEnd - noteStart) / (lineGap * 2.9)),
    8,
    24,
  );

  return {
    width,
    height,
    lineGap,
    systems: Array.from({ length: systemCount }, (_, index) => {
      const topLineY = firstTop + index * systemPitch;
      return {
        index,
        topLineY,
        bottomLineY: topLineY + lineGap * 4,
        lineGap,
        left,
        right,
        noteStart,
        noteEnd,
        slotCount,
      };
    }),
  };
}

export function resolveLatentScore(
  events: readonly LatentScoreEvent[],
  layout: ScoreLayout,
): ScoreNote[] {
  if (layout.systems.length === 0 || events.length === 0) return [];
  const eventsPerSystem = Math.ceil(events.length / layout.systems.length);
  const groups = Array.from({ length: layout.systems.length }, (_, system) =>
    events.slice(system * eventsPerSystem, (system + 1) * eventsPerSystem),
  );

  return groups.flatMap((group, systemIndex) => {
    const system = layout.systems[systemIndex];
    if (!system || group.length === 0) return [];
    const totalDuration = group.reduce((sum, event) => sum + event.duration, 0);
    let elapsedDuration = 0;

    return group.flatMap((event, slot) => {
      const eventCenter = elapsedDuration + event.duration / 2;
      const progress = totalDuration <= 1 ? 0.5 : eventCenter / totalDuration;
      const x = system.noteStart + (system.noteEnd - system.noteStart) * progress;
      elapsedDuration += event.duration;
      return event.pitches.map(({ pitch, step }, pitchIndex) => ({
        id: `${event.id}:${pitchIndex}`,
        eventId: event.id,
        revealId: event.revealId,
        sequence: event.sequence,
        duration: event.duration,
        system: systemIndex,
        slot,
        step,
        x,
        y: system.bottomLineY - step * (system.lineGap / 2),
        pitch,
      }));
    });
  });
}

export function getLatentEventIdsNearPoints(
  points: readonly { x: number; y: number }[],
  notes: readonly ScoreNote[],
  layout: ScoreLayout,
) {
  const events = new Map<
    string,
    { eventId: string; system: number; x: number }
  >();
  for (const note of notes) {
    if (!events.has(note.revealId)) {
      events.set(note.revealId, {
        eventId: note.revealId,
        system: note.system,
        x: note.x,
      });
    }
  }
  const revealed = new Set<string>();
  const horizontalRadius = layout.lineGap * 2.35;

  for (const point of points) {
    const nearestSystem = layout.systems.reduce((nearest, candidate) => {
      const nearestCenter = (nearest.topLineY + nearest.bottomLineY) / 2;
      const candidateCenter = (candidate.topLineY + candidate.bottomLineY) / 2;
      return Math.abs(point.y - candidateCenter) < Math.abs(point.y - nearestCenter)
        ? candidate
        : nearest;
    });
    const candidates = [...events.values()].filter(
      (event) => event.system === nearestSystem.index,
    );
    let found = false;
    for (const event of candidates) {
      if (Math.abs(event.x - point.x) > horizontalRadius) continue;
      revealed.add(event.eventId);
      found = true;
    }
    if (!found && candidates.length > 0) {
      const nearest = candidates.reduce((current, candidate) =>
        Math.abs(candidate.x - point.x) < Math.abs(current.x - point.x)
          ? candidate
          : current,
      );
      revealed.add(nearest.eventId);
    }
  }
  return [...revealed];
}

export function createGoldfishSchool(
  count: number,
  width: number,
  height: number,
  settings: SchoolSettings,
): GoldfishAgent[] {
  const usableWidth = Math.max(settings.minDistance, width - EDGE_MARGIN * 2);
  const usableHeight = Math.max(settings.minDistance, height - EDGE_MARGIN * 2);
  const columns = Math.max(1, Math.ceil(Math.sqrt((count * usableWidth) / usableHeight)));
  const rows = Math.max(1, Math.ceil(count / columns));

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const angle = seededUnit(index, 3) * Math.PI * 2;
    const speed = 38 + seededUnit(index, 4) * 28;
    return {
      id: index,
      x: EDGE_MARGIN + ((column + 0.5) / columns) * usableWidth,
      y: EDGE_MARGIN + ((row + 0.5) / rows) * usableHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
}

function resolveCollisions(
  agents: GoldfishAgent[],
  width: number,
  height: number,
  settings: SchoolSettings,
) {
  let resolved = agents.map((agent) => ({ ...agent }));
  const distance = settings.minDistance + settings.collisionBuffer;
  const distanceSquared = distance * distance;

  for (let pass = 0; pass < settings.collisionPasses; pass += 1) {
    const columnCount = Math.ceil(width / distance) + 1;
    const buckets = new Map<number, number[]>();
    for (let index = 0; index < resolved.length; index += 1) {
      const agent = resolved[index];
      const key =
        Math.floor(agent.y / distance) * columnCount +
        Math.floor(agent.x / distance);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(index);
      else buckets.set(key, [index]);
    }

    for (let index = 0; index < resolved.length; index += 1) {
      const agent = resolved[index];
      const column = Math.floor(agent.x / distance);
      const row = Math.floor(agent.y / distance);
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const nearby = buckets.get(
            (row + rowOffset) * columnCount + column + columnOffset,
          );
          if (!nearby) continue;
          for (const otherIndex of nearby) {
            if (otherIndex <= index) continue;
            const other = resolved[otherIndex];
            let dx = other.x - agent.x;
            let dy = other.y - agent.y;
            let squared = dx * dx + dy * dy;
            if (squared >= distanceSquared) continue;
            if (squared < 0.0001) {
              const angle = seededUnit(agent.id + other.id, pass + 11) * Math.PI * 2;
              dx = Math.cos(angle);
              dy = Math.sin(angle);
              squared = 1;
            }
            const actualDistance = Math.sqrt(squared);
            const nx = dx / actualDistance;
            const ny = dy / actualDistance;
            const overlap = (distance - actualDistance) / 2 + 0.01;
            agent.x -= nx * overlap;
            agent.y -= ny * overlap;
            other.x += nx * overlap;
            other.y += ny * overlap;
          }
        }
      }
    }
    resolved = resolved.map((agent) => ({
      ...agent,
      x: clamp(agent.x, 0, width),
      y: clamp(agent.y, 0, height),
    }));
  }
  return resolved;
}

export function settleGoldfishSchool(
  agents: GoldfishAgent[],
  width: number,
  height: number,
  settings: SchoolSettings,
  preventCollisions: boolean,
) {
  return preventCollisions
    ? resolveCollisions(agents, width, height, settings)
    : agents;
}

export function stepGoldfishSchool(
  agents: GoldfishAgent[],
  width: number,
  height: number,
  deltaSeconds: number,
  elapsedSeconds: number,
  notes: readonly ScoreNote[],
  settings: SchoolSettings,
  preventCollisions: boolean,
  agentScale: number,
) {
  const perceptionSquared = PERCEPTION_RADIUS * PERCEPTION_RADIUS;
  const separationDistance = SEPARATION_RADIUS * agentScale;
  const separationSquared = separationDistance * separationDistance;
  const columnCount = Math.ceil(width / PERCEPTION_RADIUS) + 1;
  const buckets = new Map<number, GoldfishAgent[]>();

  for (const agent of agents) {
    const key =
      Math.floor(agent.y / PERCEPTION_RADIUS) * columnCount +
      Math.floor(agent.x / PERCEPTION_RADIUS);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(agent);
    else buckets.set(key, [agent]);
  }

  const moved = agents.map((agent) => {
    let count = 0;
    let alignmentX = 0;
    let alignmentY = 0;
    let centerX = 0;
    let centerY = 0;
    let separationX = 0;
    let separationY = 0;
    const column = Math.floor(agent.x / PERCEPTION_RADIUS);
    const row = Math.floor(agent.y / PERCEPTION_RADIUS);

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const nearby = buckets.get(
          (row + rowOffset) * columnCount + column + columnOffset,
        );
        if (!nearby) continue;
        for (const other of nearby) {
          if (other.id === agent.id) continue;
          const dx = other.x - agent.x;
          const dy = other.y - agent.y;
          const squared = dx * dx + dy * dy;
          if (squared >= perceptionSquared) continue;
          count += 1;
          alignmentX += other.vx;
          alignmentY += other.vy;
          centerX += other.x;
          centerY += other.y;
          if (squared < separationSquared && squared > 0.01) {
            separationX -= dx / squared;
            separationY -= dy / squared;
          }
        }
      }
    }

    let accelerationX = separationX * 640;
    let accelerationY = separationY * 640;
    if (count > 0) {
      const inverse = 1 / count;
      accelerationX += (alignmentX * inverse - agent.vx) * 0.56;
      accelerationY += (alignmentY * inverse - agent.vy) * 0.56;
      accelerationX += (centerX * inverse - agent.x) * 0.26;
      accelerationY += (centerY * inverse - agent.y) * 0.26;
    }

    const note = notes.length > 0 ? notes[agent.id % notes.length] : null;
    if (note) {
      const dx = note.x - agent.x;
      const dy = note.y - agent.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const desiredSpeed = MAX_SPEED * clamp(distance / 110, 0.58, 1);
      accelerationX += ((dx / distance) * desiredSpeed - agent.vx) * 0.84;
      accelerationY += ((dy / distance) * desiredSpeed - agent.vy) * 0.84;
      const crossing = Math.sin(elapsedSeconds * 0.72 + agent.id * 1.37);
      accelerationX += (-dy / distance) * crossing * 7;
      accelerationY += (dx / distance) * crossing * 7;
    }

    if (agent.x < EDGE_MARGIN) accelerationX += (EDGE_MARGIN - agent.x) * 1.8;
    if (agent.x > width - EDGE_MARGIN) accelerationX -= (agent.x - width + EDGE_MARGIN) * 1.8;
    if (agent.y < EDGE_MARGIN) accelerationY += (EDGE_MARGIN - agent.y) * 1.8;
    if (agent.y > height - EDGE_MARGIN) accelerationY -= (agent.y - height + EDGE_MARGIN) * 1.8;

    const acceleration = limitVector(accelerationX, accelerationY, 82);
    let vx = agent.vx + acceleration.x * deltaSeconds;
    let vy = agent.vy + acceleration.y * deltaSeconds;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) {
      vx *= MAX_SPEED / speed;
      vy *= MAX_SPEED / speed;
    } else if (speed < MIN_SPEED && speed > 0) {
      vx *= MIN_SPEED / speed;
      vy *= MIN_SPEED / speed;
    }

    return {
      ...agent,
      x: clamp(agent.x + vx * deltaSeconds, 0, width),
      y: clamp(agent.y + vy * deltaSeconds, 0, height),
      vx,
      vy,
    };
  });

  return preventCollisions
    ? resolveCollisions(moved, width, height, settings)
    : moved;
}
