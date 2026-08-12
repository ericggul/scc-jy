import { randomUUID } from "node:crypto";

const id = "finger-skating";
const variants = new Set(["1", "2"]);
const clients = new Map();
const lastSignals = new Map();

const events = {
  join: "finger-skating:join",
  hello: "finger-skating:hello",
  presence: "finger-skating:presence",
  signalIn: "finger-skating:signal:in",
  signalOut: "finger-skating:signal:out",
};

function getRoom(variantId) {
  return `experiment:${id}:${variantId}`;
}

function getPresence(io, variantId) {
  const room = getRoom(variantId);
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    experimentId: id,
    variantId,
    total: sockets.length,
    mobiles: sockets.filter((socket) => socket.data[id]?.role === "mobile")
      .length,
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

function broadcastPresence(io, variantId) {
  io.to(getRoom(variantId)).emit(
    events.presence,
    getPresence(io, variantId),
  );
}

function normalizeSignal(socket, payload = {}) {
  const variantId = socket.data[id]?.variantId;
  const pointerId = Number.isFinite(payload.pointerId)
    ? payload.pointerId
    : undefined;
  const streamId =
    typeof payload.streamId === "string" && payload.streamId.length > 0
      ? `${socket.id}:${payload.streamId}`
      : pointerId === undefined
        ? undefined
        : `${socket.id}:pointer-${pointerId}`;
  const phase =
    payload.phase === "start" ||
    payload.phase === "move" ||
    payload.phase === "end"
      ? payload.phase
      : undefined;

  return {
    id: randomUUID(),
    experimentId: id,
    variantId,
    from: socket.id,
    role: socket.data[id]?.role || "unknown",
    sentAt: Date.now(),
    streamId,
    pointerId,
    phase,
    hue: Number.isFinite(payload.hue) ? payload.hue : 12,
    intensity: Number.isFinite(payload.intensity) ? payload.intensity : 0.5,
    x: Number.isFinite(payload.x) ? payload.x : 0.5,
    y: Number.isFinite(payload.y) ? payload.y : 0.5,
    label: typeof payload.label === "string" ? payload.label : "pulse",
  };
}

function register({ io, socket }) {
  socket.on(events.join, ({ role, experimentSlug } = {}) => {
    if (!variants.has(experimentSlug)) return;

    const variantId = experimentSlug;
    socket.data[id] = {
      variantId,
      role: role === "mobile" || role === "screen" ? role : "unknown",
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(getRoom(variantId));
    socket.emit(events.hello, {
      socketId: socket.id,
      lastSignal: lastSignals.get(variantId) ?? null,
      presence: getPresence(io, variantId),
    });
    broadcastPresence(io, variantId);
  });

  socket.on(events.signalIn, (payload = {}) => {
    const variantId = socket.data[id]?.variantId;
    if (!variantId || !socket.rooms.has(getRoom(variantId))) return;

    const signal = normalizeSignal(socket, payload);
    lastSignals.set(variantId, signal);
    io.to(getRoom(variantId)).emit(events.signalOut, signal);
  });

  socket.on("disconnect", () => {
    const variantId = socket.data[id]?.variantId;
    clients.delete(socket.id);
    if (variantId) broadcastPresence(io, variantId);
  });
}

export const fingerSkatingExperiment = {
  id,
  events,
  register,
};
