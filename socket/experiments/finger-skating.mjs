import { randomUUID } from "node:crypto";

const id = "finger-skating";
const room = `experiment:${id}`;
const clients = new Map();
let lastSignal = null;

const events = {
  join: "finger-skating:join",
  hello: "finger-skating:hello",
  presence: "finger-skating:presence",
  signalIn: "finger-skating:signal:in",
  signalOut: "finger-skating:signal:out",
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

function normalizeSignal(socket, payload = {}) {
  return {
    id: randomUUID(),
    experimentId: id,
    from: socket.id,
    role: socket.data[id]?.role || "unknown",
    sentAt: Date.now(),
    hue: Number.isFinite(payload.hue) ? payload.hue : 12,
    intensity: Number.isFinite(payload.intensity) ? payload.intensity : 0.5,
    x: Number.isFinite(payload.x) ? payload.x : 0.5,
    y: Number.isFinite(payload.y) ? payload.y : 0.5,
    label: typeof payload.label === "string" ? payload.label : "pulse",
  };
}

function register({ io, socket }) {
  socket.on(events.join, ({ role } = {}) => {
    socket.data[id] = {
      role: role === "mobile" || role === "screen" ? role : "unknown",
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
    lastSignal = signal;
    io.to(room).emit(events.signalOut, signal);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    broadcastPresence(io);
  });
}

export const fingerSkatingExperiment = {
  id,
  events,
  register,
};
