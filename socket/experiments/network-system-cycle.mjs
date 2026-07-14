import {
  applyCycleIntervention,
  createCycleRuntime,
  cycleModelIds,
  resetCycle,
  snapshotCycle,
  stepCycle,
} from "./network-system-cycle-model.mjs";

const id = "network-system-cycle";
const variantId = "cycle";
export const networkSystemCycleRoom = "experiment:network-system:cycle";
const clients = new Map();
const runtime = createCycleRuntime();
let ioRef = null;

const events = {
  join: "network-system-cycle:join",
  hello: "network-system-cycle:hello",
  presence: "network-system-cycle:presence",
  stateOut: "network-system-cycle:state",
  interventionIn: "network-system-cycle:intervention:in",
  resetIn: "network-system-cycle:reset:in",
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeIntervention(payload = {}) {
  if (
    payload.kind === "node-shock" &&
    cycleModelIds.nodeIds.includes(payload.nodeId)
  ) {
    return {
      kind: "node-shock",
      nodeId: payload.nodeId,
      amount: clamp(payload.amount, -1, 1),
    };
  }

  if (
    payload.kind === "edge-weight" &&
    cycleModelIds.edgeIds.includes(payload.edgeId)
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
    socket.rooms.has(networkSystemCycleRoom),
  );

  return {
    experimentId: "network-system",
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
  io.to(networkSystemCycleRoom).emit(events.presence, getPresence(io));
}

function broadcastState(io) {
  const state = snapshotCycle(runtime);
  io.to(networkSystemCycleRoom).emit(events.stateOut, state);
  return state;
}

setInterval(() => {
  stepCycle(runtime, Date.now(), 0.025);
  if (ioRef) broadcastState(ioRef);
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
    socket.join(networkSystemCycleRoom);
    socket.emit(events.hello, {
      state: snapshotCycle(runtime),
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on(events.interventionIn, (payload = {}) => {
    if (
      !socket.rooms.has(networkSystemCycleRoom) ||
      socket.data[id]?.role !== "controller"
    ) {
      return;
    }

    const intervention = normalizeIntervention(payload);
    if (!intervention) return;
    applyCycleIntervention(runtime, intervention, Date.now());
  });

  socket.on(events.resetIn, () => {
    if (
      !socket.rooms.has(networkSystemCycleRoom) ||
      socket.data[id]?.role !== "controller"
    ) {
      return;
    }

    resetCycle(runtime, Date.now());
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]?.variantId === variantId) broadcastPresence(io);
  });
}

export const networkSystemCycleExperiment = {
  id,
  events,
  register,
};
