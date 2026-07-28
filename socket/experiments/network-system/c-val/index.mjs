import {
  cValModelTiming,
  createCValRuntime,
  resetCValRuntime,
  setCValOrientation,
  snapshotCValRuntime,
  stepCValRuntime,
} from "./model.mjs";

const familyId = "network-system";
const variantId = "c-val";
const id = `${familyId}:${variantId}`;
export const networkSystemCValRoom = `experiment:${familyId}:${variantId}`;
const clients = new Map();
const runtime = createCValRuntime();
let ioRef = null;

const events = {
  join: "network-system-c-val:join",
  hello: "network-system-c-val:hello",
  presence: "network-system-c-val:presence",
  stateOut: "network-system-c-val:state",
  orientationIn: "network-system-c-val:orientation:in",
  resetIn: "network-system-c-val:reset:in",
};

function normalizeOrientation(payload = {}) {
  if (
    !Number.isFinite(payload.alpha) ||
    !Number.isFinite(payload.beta) ||
    !Number.isFinite(payload.gamma)
  ) {
    return null;
  }
  return {
    absolute: Boolean(payload.absolute),
    alpha: payload.alpha,
    beta: payload.beta,
    gamma: payload.gamma,
  };
}

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(networkSystemCValRoom),
  );

  return {
    experimentId: familyId,
    variantId,
    total: sockets.length,
    mobiles: sockets.filter((socket) => socket.data[id]?.role === "mobile")
      .length,
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
  io.to(networkSystemCValRoom).emit(events.presence, getPresence(io));
}

function broadcastState(io) {
  const state = snapshotCValRuntime(runtime);
  io.to(networkSystemCValRoom).emit(events.stateOut, state);
  return state;
}

setInterval(() => {
  const now = Date.now();
  stepCValRuntime(runtime, now, cValModelTiming.broadcastIntervalMs / 1000);
  if (
    ioRef?.sockets.adapter.rooms.get(networkSystemCValRoom)?.size
  ) {
    broadcastState(ioRef);
  }
}, cValModelTiming.broadcastIntervalMs).unref();

function register({ io, socket }) {
  ioRef = io;

  socket.on(events.join, ({ role, experimentSlug } = {}) => {
    if (experimentSlug !== variantId) return;
    const normalizedRole =
      role === "mobile" || role === "controller" || role === "screen"
        ? role
        : "unknown";
    socket.data[id] = { role: normalizedRole, variantId };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(networkSystemCValRoom);
    socket.emit(events.hello, {
      state: snapshotCValRuntime(runtime),
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on(events.orientationIn, (payload = {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(networkSystemCValRoom)
    ) {
      return;
    }
    const orientation = normalizeOrientation(payload);
    if (!orientation) return;
    setCValOrientation(runtime, orientation, Date.now());
  });

  socket.on(events.resetIn, () => {
    if (
      socket.data[id]?.role !== "controller" ||
      !socket.rooms.has(networkSystemCValRoom)
    ) {
      return;
    }
    resetCValRuntime(runtime, Date.now());
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]?.variantId === variantId) broadcastPresence(io);
  });
}

export const networkSystemCValExperiment = {
  id,
  events,
  register,
};
