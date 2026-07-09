import { randomUUID } from "node:crypto";

const id = "dj";
const room = `experiment:${id}`;
const clients = new Map();
let lastSignal = null;

const nodeIds = ["1", "2", "3", "4"];
const edgeTargets = new Map([
  ["1-2", ["1", "2"]],
  ["1-3", ["1", "3"]],
  ["1-4", ["1", "4"]],
  ["2-3", ["2", "3"]],
  ["2-4", ["2", "4"]],
  ["3-4", ["3", "4"]],
]);

const events = {
  join: "dj:join",
  hello: "dj:hello",
  presence: "dj:presence",
  signalIn: "dj:signal:in",
  signalOut: "dj:signal:out",
};

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    experimentId: id,
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

function broadcastPresence(io) {
  io.to(room).emit(events.presence, getPresence(io));
}

function normalizeCoordinate(value) {
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(value, 0), 1);
}

function normalizeSignal(socket, payload = {}) {
  const source = payload.source === "edge" ? "edge" : "node";
  const nodeId = typeof payload.nodeId === "string" ? payload.nodeId : null;
  const edgeId = typeof payload.edgeId === "string" ? payload.edgeId : null;
  const targetScreenIds =
    source === "edge"
      ? edgeTargets.get(edgeId) || null
      : nodeIds.includes(nodeId)
        ? [nodeId]
        : null;

  if (!targetScreenIds) return null;

  return {
    id: randomUUID(),
    experimentId: id,
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
  socket.on(events.join, ({ role } = {}) => {
    socket.data[id] = {
      role: role === "controller" || role === "screen" ? role : "unknown",
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(room);
    socket.emit(events.hello, {
      socketId: socket.id,
      lastSignal,
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on(events.signalIn, (payload = {}) => {
    if (!socket.rooms.has(room)) return;

    const signal = normalizeSignal(socket, payload);
    if (!signal) return;

    lastSignal = signal;
    io.to(room).emit(events.signalOut, signal);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    broadcastPresence(io);
  });
}

export const djExperiment = {
  id,
  events,
  register,
};
