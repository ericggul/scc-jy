import { randomUUID } from "node:crypto";

const id = "dj";
const clients = new Map();
const lastSignals = new Map();

const variants = {
  "1": {
    nodeIds: ["1", "2", "3", "4"],
    edgeTargets: new Map([
      ["1-2", ["1", "2"]],
      ["1-3", ["1", "3"]],
      ["1-4", ["1", "4"]],
      ["2-3", ["2", "3"]],
      ["2-4", ["2", "4"]],
      ["3-4", ["3", "4"]],
    ]),
    defaultParameters: null,
  },
  "2": {
    nodeIds: ["1", "2"],
    edgeTargets: new Map([["1-2", ["1", "2"]]]),
    defaultParameters: {
      coupling: 0,
      diffusionA: 0.92,
      diffusionB: 0.48,
      rooms: {
        "1": { feed: 0.026, kill: 0.052, drive: 0 },
        "2": { feed: 0.026, kill: 0.052, drive: 0 },
      },
    },
  },
};

const events = {
  join: "dj:join",
  hello: "dj:hello",
  presence: "dj:presence",
  signalIn: "dj:signal:in",
  signalOut: "dj:signal:out",
};

function normalizeExperimentSlug(value) {
  return variants[value] ? value : "1";
}

function getRoom(experimentSlug) {
  return `experiment:${id}:${experimentSlug}`;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeCoordinate(value) {
  if (!Number.isFinite(value)) return null;
  return clamp(value, 0, 1);
}

function normalizeReactionParameters(payload = {}) {
  const defaults = variants["2"].defaultParameters;
  const rooms = payload.rooms || {};

  return {
    coupling: clamp(payload.coupling, 0, 1),
    diffusionA: clamp(payload.diffusionA, 0.2, 1.4),
    diffusionB: clamp(payload.diffusionB, 0.1, 0.9),
    rooms: {
      "1": normalizeRoomParameters(rooms["1"], defaults.rooms["1"]),
      "2": normalizeRoomParameters(rooms["2"], defaults.rooms["2"]),
    },
  };
}

function normalizeReactionInteraction(payload = {}) {
  const target =
    payload.target === "2"
      ? "2"
      : payload.target === "connector"
        ? "connector"
        : "1";

  return {
    target,
    localX: clamp(payload.localX, 0, 1),
    localY: clamp(payload.localY, 0, 1),
    materialA: clamp(payload.materialA, 0, 1),
    materialB: clamp(payload.materialB, 0, 1),
    strength: clamp(payload.strength, 0, 1),
  };
}

function normalizeRoomParameters(payload = {}, defaults) {
  return {
    feed: clamp(payload.feed, 0.012, 0.072) || defaults.feed,
    kill: clamp(payload.kill, 0.034, 0.078) || defaults.kill,
    drive: clamp(payload.drive, 0, 1),
  };
}

function getLastSignal(experimentSlug) {
  return lastSignals.get(experimentSlug) || null;
}

function getPresence(io, experimentSlug) {
  const room = getRoom(experimentSlug);
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    experimentId: id,
    variantId: experimentSlug,
    total: sockets.length,
    controllers: sockets.filter(
      (socket) => socket.data[id]?.role === "controller",
    ).length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen")
      .length,
    clients: sockets.map((socket) => ({
      id: socket.id,
      role: socket.data[id]?.role || "unknown",
      connectedAt: clients.get(socket.id)?.connectedAt || Date.now(),
    })),
    serverTime: Date.now(),
  };
}

function broadcastPresence(io, experimentSlug) {
  io.to(getRoom(experimentSlug)).emit(events.presence, getPresence(io, experimentSlug));
}

function normalizeSignal(socket, payload = {}) {
  const experimentSlug = socket.data[id]?.experimentSlug || "1";
  const variant = variants[experimentSlug] || variants["1"];
  const source = payload.source === "edge"
    ? "edge"
    : payload.source === "parameter"
      ? "parameter"
      : "node";

  if (source === "parameter" && experimentSlug === "2") {
    return {
      id: randomUUID(),
      experimentId: id,
      variantId: experimentSlug,
      from: socket.id,
      role: socket.data[id]?.role || "unknown",
      sentAt: Date.now(),
      source,
      nodeId: null,
      edgeId: null,
      targetScreenIds: variant.nodeIds,
      x: normalizeCoordinate(payload.x),
      y: normalizeCoordinate(payload.y),
      parameters: normalizeReactionParameters(payload.parameters),
      interaction: normalizeReactionInteraction(payload.interaction),
    };
  }

  const nodeId = typeof payload.nodeId === "string" ? payload.nodeId : null;
  const edgeId = typeof payload.edgeId === "string" ? payload.edgeId : null;
  const targetScreenIds =
    source === "edge"
      ? variant.edgeTargets.get(edgeId) || null
      : variant.nodeIds.includes(nodeId)
        ? [nodeId]
        : null;

  if (!targetScreenIds) return null;

  return {
    id: randomUUID(),
    experimentId: id,
    variantId: experimentSlug,
    from: socket.id,
    role: socket.data[id]?.role || "unknown",
    sentAt: Date.now(),
    source,
    nodeId: source === "node" ? nodeId : null,
    edgeId: source === "edge" ? edgeId : null,
    targetScreenIds,
    x: normalizeCoordinate(payload.x),
    y: normalizeCoordinate(payload.y),
  };
}

function register({ io, socket }) {
  socket.on(events.join, ({ role, experimentSlug: rawExperimentSlug } = {}) => {
    const experimentSlug = normalizeExperimentSlug(rawExperimentSlug);
    socket.data[id] = {
      experimentSlug,
      role: role === "controller" || role === "screen" ? role : "unknown",
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(getRoom(experimentSlug));
    socket.emit(events.hello, {
      socketId: socket.id,
      lastSignal: getLastSignal(experimentSlug),
      presence: getPresence(io, experimentSlug),
    });
    broadcastPresence(io, experimentSlug);
  });

  socket.on(events.signalIn, (payload = {}) => {
    const experimentSlug = socket.data[id]?.experimentSlug || "1";
    const room = getRoom(experimentSlug);
    if (!socket.rooms.has(room)) return;

    const signal = normalizeSignal(socket, payload);
    if (!signal) return;

    lastSignals.set(experimentSlug, signal);
    io.to(room).emit(events.signalOut, signal);
  });

  socket.on("disconnect", () => {
    const experimentSlug = socket.data[id]?.experimentSlug;
    clients.delete(socket.id);
    if (experimentSlug) {
      broadcastPresence(io, experimentSlug);
    }
  });
}

export const djExperiment = {
  id,
  events,
  register,
};
