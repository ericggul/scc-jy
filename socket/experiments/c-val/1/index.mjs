import {
  cValModelTiming,
  createCValRuntime,
  resetCValRuntime,
  setCValOrientation,
  snapshotCValRuntime,
  stepCValRuntime,
} from "./model.mjs";
import {
  clearCValDiagnostics,
  createCValDiagnostics,
  flushCValDiagnostics,
  observeCValDiagnostics,
} from "./diagnostics.mjs";

const familyId = "c-val";
const version = "1";
const id = `${familyId}:${version}`;
export const cValOneRoom = `experiment:${familyId}:${version}`;
const clients = new Map();
const runtime = createCValRuntime();
const diagnostics = createCValDiagnostics();
let ioRef = null;

const events = {
  join: "c-val-1:join",
  hello: "c-val-1:hello",
  presence: "c-val-1:presence",
  stateOut: "c-val-1:state",
  orientationIn: "c-val-1:orientation:in",
  resetIn: "c-val-1:reset:in",
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
    socket.rooms.has(cValOneRoom),
  );

  return {
    experimentId: familyId,
    version,
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
  io.to(cValOneRoom).emit(events.presence, getPresence(io));
}

function broadcastState(io) {
  const state = snapshotCValRuntime(runtime);
  io.to(cValOneRoom).emit(events.stateOut, state);
  return state;
}

setInterval(() => {
  const now = Date.now();
  stepCValRuntime(runtime, now, cValModelTiming.broadcastIntervalMs / 1000);
  const activeClientCount =
    ioRef?.sockets.adapter.rooms.get(cValOneRoom)?.size ?? 0;
  if (activeClientCount > 0) {
    const state = broadcastState(ioRef);
    observeCValDiagnostics(diagnostics, state);
    flushCValDiagnostics(diagnostics, now);
  } else {
    clearCValDiagnostics(diagnostics, now);
  }
}, cValModelTiming.broadcastIntervalMs).unref();

function register({ io, socket }) {
  ioRef = io;

  socket.on(events.join, ({ role, version: requestedVersion } = {}) => {
    if (requestedVersion !== version) return;
    const normalizedRole =
      role === "mobile" || role === "controller" || role === "screen"
        ? role
        : "unknown";
    socket.data[id] = { role: normalizedRole, version };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(cValOneRoom);
    socket.emit(events.hello, {
      state: snapshotCValRuntime(runtime),
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on(events.orientationIn, (payload = {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(cValOneRoom)
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
      !socket.rooms.has(cValOneRoom)
    ) {
      return;
    }
    const now = Date.now();
    resetCValRuntime(runtime, now);
    clearCValDiagnostics(diagnostics, now);
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]?.version === version) broadcastPresence(io);
  });
}

export const cValOneExperiment = {
  id,
  version,
  events,
  register,
};

