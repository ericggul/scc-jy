import { randomUUID } from "node:crypto";

const id = "finger-skating:field:1";
const room = "experiment:finger-skating:field:1";
const clients = new Map();

const events = {
  join: "finger-skating-field-1:join",
  hello: "finger-skating-field-1:hello",
  presence: "finger-skating-field-1:presence",
  gestureIn: "finger-skating-field-1:gesture:in",
  gestureOut: "finger-skating-field-1:gesture:out",
};

function getPresence(io) {
  const sockets = [...io.sockets.sockets.values()].filter((socket) =>
    socket.rooms.has(room),
  );

  return {
    experimentId: id,
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

function broadcastPresence(io) {
  io.to(room).emit(events.presence, getPresence(io));
}

function normalizeGesture(socket, payload = {}) {
  if (
    !/^(like|comment|repost|send|save)$/.test(payload.controlId) ||
    !Number.isInteger(payload.pointerId) ||
    !Number.isFinite(payload.x) ||
    !Number.isFinite(payload.y) ||
    !["start", "move", "end"].includes(payload.phase)
  ) {
    return null;
  }

  return {
    controlId: payload.controlId,
    id: randomUUID(),
    from: socket.id,
    pointerId: payload.pointerId,
    phase: payload.phase,
    sentAt: Date.now(),
    x: Math.min(Math.max(payload.x, 0), 1),
    y: Math.min(Math.max(payload.y, 0), 1),
  };
}

function register({ io, socket }) {
  socket.on(events.join, ({ role } = {}) => {
    socket.data[id] = {
      role: role === "mobile" || role === "screen" ? role : "unknown",
    };
    clients.set(socket.id, { connectedAt: Date.now() });
    socket.join(room);
    socket.emit(events.hello, { presence: getPresence(io) });
    broadcastPresence(io);
  });

  socket.on(events.gestureIn, (payload = {}) => {
    if (
      !socket.rooms.has(room) ||
      socket.data[id]?.role !== "mobile"
    ) {
      return;
    }

    const gesture = normalizeGesture(socket, payload);
    if (!gesture) return;
    io.to(room).emit(events.gestureOut, gesture);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    if (socket.data[id]) broadcastPresence(io);
  });
}

export const fingerSkatingFieldOneExperiment = { id, events, register };
