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
const version = "2";
const id = `${familyId}:${version}`;
export const cValTwoRoom = `experiment:${familyId}:${version}`;
const clients = new Map();
const runtime = createCValRuntime();
const diagnostics = createCValDiagnostics();
let ioRef = null;

const events = {
  join: "c-val-2:join",
  hello: "c-val-2:hello",
  presence: "c-val-2:presence",
  stateOut: "c-val-2:state",
  orientationIn: "c-val-2:orientation:in",
  resetIn: "c-val-2:reset:in",
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
    socket.rooms.has(cValTwoRoom),
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
  io.to(cValTwoRoom).emit(events.presence, getPresence(io));
}

function broadcastState(io) {
  const state = snapshotCValRuntime(runtime);
  io.to(cValTwoRoom).emit(events.stateOut, state);
  return state;
}

setInterval(() => {
  const now = Date.now();
  stepCValRuntime(runtime, now, cValModelTiming.broadcastIntervalMs / 1000);
  const activeClientCount =
    ioRef?.sockets.adapter.rooms.get(cValTwoRoom)?.size ?? 0;
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
    socket.join(cValTwoRoom);
    socket.emit(events.hello, {
      state: snapshotCValRuntime(runtime),
      presence: getPresence(io),
    });
    broadcastPresence(io);
  });

  socket.on(events.orientationIn, (payload = {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(cValTwoRoom)
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
      !socket.rooms.has(cValTwoRoom)
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

export const cValTwoExperiment = {
  id,
  version,
  events,
  register,
};

