import {
  applyNetworkSystemIntervention,
  createNetworkSystemRuntime,
  networkSystemModelIds,
  resetNetworkSystem,
  snapshotNetworkSystem,
  stepNetworkSystem,
} from "./model.mjs";

const familyId = "network-system";
const variantId = "macro-economy";
const id = `${familyId}:${variantId}`;
const room = `experiment:${familyId}:${variantId}`;
const clients = new Map();
const runtime = createNetworkSystemRuntime();
let ioRef = null;

const events = {
  join: "network-system-macro-economy:join",
  hello: "network-system-macro-economy:hello",
  presence: "network-system-macro-economy:presence",
  stateOut: "network-system-macro-economy:state",
  interventionIn: "network-system-macro-economy:intervention:in",
  resetIn: "network-system-macro-economy:reset:in",
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeIntervention(payload = {}) {
  if (
    payload.kind === "node-shock" &&
    networkSystemModelIds.institutionIds.includes(payload.institutionId)
  ) {
    return {
      kind: "node-shock",
      institutionId: payload.institutionId,
      amount: clamp(payload.amount, -1, 1),
    };
  }

  if (
    payload.kind === "edge-weight" &&
    networkSystemModelIds.edgeIds.includes(payload.edgeId)
  ) {
    return {
      kind: "edge-weight",
      edgeId: payload.edgeId,
      amount: clamp(payload.amount, -1, 1),
    };
  }

  return null;
}

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    experimentId: familyId,
    variantId,
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

function broadcastState(io) {
  const state = snapshotNetworkSystem(runtime);
  io.to(room).emit(events.stateOut, state);
  return state;
}

setInterval(() => {
  stepNetworkSystem(runtime, Date.now(), 0.1);
  if (ioRef) {
    broadcastState(ioRef);
  }
}, 100).unref();

function register({ io, socket }) {
  ioRef = io;

  socket.on(events.join, ({ role, experimentSlug } = {}) => {
    if (experimentSlug !== variantId) return;

    socket.data[id] = {
      variantId,
      role: role === "controller" || role === "screen" ? role : "unknown",
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(room);
    socket.emit(events.hello, {
      state: snapshotNetworkSystem(runtime),
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on(events.interventionIn, (payload = {}) => {
    if (
      !socket.rooms.has(room) ||
      socket.data[id]?.role !== "controller"
    ) {
      return;
    }

    const intervention = normalizeIntervention(payload);
    if (!intervention) return;

    applyNetworkSystemIntervention(runtime, intervention, Date.now());
  });

  socket.on(events.resetIn, () => {
    if (
      !socket.rooms.has(room) ||
      socket.data[id]?.role !== "controller"
    ) {
      return;
    }

    resetNetworkSystem(runtime, Date.now());
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]?.variantId === variantId) broadcastPresence(io);
  });
}

export const networkSystemMacroEconomyExperiment = {
  id,
  events,
  register,
};
