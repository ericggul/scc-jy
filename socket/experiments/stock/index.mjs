import { randomUUID } from "node:crypto";

const id = "stock";
const variantId = "1";
const room = `experiment:${id}:${variantId}`;
const clients = new Map();
let lastOrientation = null;
let revision = 0;

const events = {
  hello: "stock:hello",
  join: "stock:join",
  orientationIn: "stock:orientation:in",
  orientationOut: "stock:orientation:out",
  presence: "stock:presence",
};

function clamp(value, minimum, maximum) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(minimum, Math.min(value, maximum));
}

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    clients: sockets.map((socket) => ({
      connectedAt: clients.get(socket.id)?.connectedAt || Date.now(),
      id: socket.id,
      role: socket.data[id]?.role || "unknown",
    })),
    experimentId: id,
    mobiles: sockets.filter((socket) => socket.data[id]?.role === "mobile").length,
    screens: sockets.filter((socket) => socket.data[id]?.role === "screen").length,
    serverTime: Date.now(),
    total: sockets.length,
    variantId,
  };
}

function broadcastPresence(io) {
  io.to(room).emit(events.presence, getPresence(io));
}

function normalizeOrientation(socket, payload = {}) {
  if (
    !Number.isFinite(payload.alpha) ||
    !Number.isFinite(payload.beta) ||
    !Number.isFinite(payload.gamma)
  ) {
    return null;
  }

  revision += 1;
  return {
    absolute: Boolean(payload.absolute),
    alpha: clamp(payload.alpha, -180, 180),
    beta: clamp(payload.beta, -180, 180),
    experimentId: id,
    from: socket.id,
    gamma: clamp(payload.gamma, -90, 90),
    id: randomUUID(),
    revision,
    sentAt: Date.now(),
    variantId,
  };
}

function register({ io, socket }) {
  socket.on(events.join, ({ experimentSlug, role } = {}) => {
    if (experimentSlug !== variantId) return;
    socket.data[id] = {
      role: role === "mobile" || role === "screen" ? role : "unknown",
      variantId,
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(room);
    socket.emit(events.hello, {
      lastOrientation,
      presence: getPresence(io),
      socketId: socket.id,
    });
    broadcastPresence(io);
  });

  socket.on(events.orientationIn, (payload = {}) => {
    if (socket.data[id]?.role !== "mobile" || !socket.rooms.has(room)) return;
    const orientation = normalizeOrientation(socket, payload);
    if (!orientation) return;
    lastOrientation = orientation;
    io.to(room).emit(events.orientationOut, orientation);
  });

  socket.on("disconnect", () => {
    const joined = socket.data[id]?.variantId === variantId;
    clients.delete(socket.id);
    if (joined) broadcastPresence(io);
  });
}

export const stockExperiment = { events, id, register };
