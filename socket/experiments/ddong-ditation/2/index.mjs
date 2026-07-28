import { randomUUID } from "node:crypto";

const id = "ddong-ditation-2";
const variantId = "2";
const room = `experiment:ddong-ditation:${variantId}`;
const archiveLimit = 80;
const activeSessions = new Map();
const archive = [];

const events = {
  join: "ddong-ditation:2:join",
  hello: "ddong-ditation:2:hello",
  state: "ddong-ditation:2:state",
  sessionIn: "ddong-ditation:2:session:in",
};

function getPresence(io) {
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
    serverTime: Date.now(),
  };
}

function getSnapshot(io) {
  return {
    activeSessions: [...activeSessions.values()],
    archive: [...archive],
    presence: getPresence(io),
  };
}

function broadcastState(io) {
  io.to(room).emit(events.state, getSnapshot(io));
}

function archiveSession(session, outcome) {
  const endedAt = Date.now();
  archive.unshift({
    id: randomUUID(),
    startedAt: session.startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - session.startedAt),
    cycleCount: session.cycleCount,
    outcome,
  });

  if (archive.length > archiveLimit) archive.length = archiveLimit;
}

function startSession(socket) {
  if (activeSessions.has(socket.id)) return;
  const now = Date.now();
  activeSessions.set(socket.id, {
    id: randomUUID(),
    participantId: socket.id,
    startedAt: now,
    updatedAt: now,
    phase: "arriving",
    cycleCount: 0,
  });
}

function updateSession(socket, payload) {
  const current = activeSessions.get(socket.id);
  if (!current) return;
  const phase =
    payload.phase === "arriving" ||
    payload.phase === "breathing" ||
    payload.phase === "releasing"
      ? payload.phase
      : current.phase;
  const cycleCount = Number.isFinite(payload.cycleCount)
    ? Math.max(0, Math.min(999, Math.floor(payload.cycleCount)))
    : current.cycleCount;

  activeSessions.set(socket.id, {
    ...current,
    phase,
    cycleCount,
    updatedAt: Date.now(),
  });
}

function completeSession(socket, outcome = "completed") {
  const session = activeSessions.get(socket.id);
  if (!session) return;
  activeSessions.delete(socket.id);
  archiveSession(session, outcome);
}

function register({ io, socket }) {
  socket.on(events.join, ({ role } = {}) => {
    socket.data[id] = {
      variantId,
      role: role === "mobile" || role === "screen" ? role : "unknown",
    };
    socket.join(room);
    socket.emit(events.hello, getSnapshot(io));
    broadcastState(io);
  });

  socket.on(events.sessionIn, (payload = {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(room)
    ) {
      return;
    }

    if (payload.action === "start") startSession(socket);
    if (payload.action === "update") updateSession(socket, payload);
    if (payload.action === "complete") completeSession(socket);
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    if (activeSessions.has(socket.id)) completeSession(socket, "left");
    if (socket.data[id]?.variantId === variantId) broadcastState(io);
  });
}

export const ddongDitationTwoExperiment = {
  id,
  events,
  register,
};
