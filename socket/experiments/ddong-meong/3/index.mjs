import { randomUUID } from "node:crypto";
import {
  loadDdongMeongArchive,
  saveDdongMeongArchive,
} from "./archive-store.mjs";

const id = "ddong-meong-3";
const variantId = "3";
const room = `experiment:ddong-meong:${variantId}`;
const archiveLimit = 5_000;
const activeSessions = new Map();
const archive = loadDdongMeongArchive();

const contents = {
  dummy: "보내는 연습",
  "letting-go": "놓아보내는 연습",
  "waiting-body": "기다리는 몸",
  "downward-breath": "아래로 흐르는 숨",
  "private-room": "혼자 있는 방",
  "lighter-moment": "가벼워지는 순간",
};

const events = {
  join: "ddong-meong:3:join",
  hello: "ddong-meong:3:hello",
  state: "ddong-meong:3:state",
  sessionIn: "ddong-meong:3:session:in",
};

function koreanDay(timestamp = Date.now()) {
  const values = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(timestamp);
  const part = (type) => values.find((value) => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function cleanText(value, fallback, maximumLength) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
  return cleaned || fallback;
}

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
  const dayKey = koreanDay();
  const todayArchive = archive.filter((entry) => entry.dayKey === dayKey);
  const todayParticipants = new Set(
    todayArchive.map((entry) => entry.participantId),
  );
  for (const session of activeSessions.values()) {
    todayParticipants.add(session.participantId);
  }

  return {
    activeSessions: [...activeSessions.values()],
    archive: todayArchive,
    presence: getPresence(io),
    today: {
      completedSessions: todayArchive.length,
      dayKey,
      participantCount: todayParticipants.size,
    },
  };
}

function broadcastState(io) {
  io.to(room).emit(events.state, getSnapshot(io));
}

function archiveSession(session, outcome) {
  const endedAt = Date.now();
  archive.unshift({
    contentSlug: session.contentSlug,
    contentTitle: session.contentTitle,
    dayKey: koreanDay(endedAt),
    id: randomUUID(),
    interactionCount: session.interactionCount,
    nickname: session.nickname,
    participantId: session.participantId,
    startedAt: session.startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - session.startedAt),
    outcome,
  });

  if (archive.length > archiveLimit) archive.length = archiveLimit;
  saveDdongMeongArchive(archive);
}

function startSession(socket, payload) {
  if (activeSessions.has(socket.id)) return;

  const contentSlug = Object.hasOwn(contents, payload.contentSlug)
    ? payload.contentSlug
    : "dummy";
  const now = Date.now();
  activeSessions.set(socket.id, {
    contentSlug,
    contentTitle: contents[contentSlug],
    id: randomUUID(),
    interactionCount: 0,
    nickname: cleanText(payload.nickname, "이름 없는 사람", 16),
    participantId: cleanText(payload.participantId, socket.id, 80),
    startedAt: now,
    updatedAt: now,
    phase: "arriving",
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
  const interactionCount = Number.isFinite(payload.interactionCount)
    ? Math.max(0, Math.min(9_999, Math.floor(payload.interactionCount)))
    : current.interactionCount;

  activeSessions.set(socket.id, {
    ...current,
    phase,
    interactionCount,
    updatedAt: Date.now(),
  });
}

function completeSession(socket, outcome = "completed") {
  const session = activeSessions.get(socket.id);
  if (!session) return;
  activeSessions.delete(socket.id);
  archiveSession(
    session,
    outcome === "flushed" || outcome === "left" ? outcome : "completed",
  );
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

    if (payload.action === "start") startSession(socket, payload);
    if (payload.action === "update") updateSession(socket, payload);
    if (payload.action === "complete") completeSession(socket, payload.outcome);
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    if (activeSessions.has(socket.id)) completeSession(socket, "left");
    if (socket.data[id]?.variantId === variantId) broadcastState(io);
  });
}

export const ddongMeongThreeExperiment = {
  id,
  events,
  register,
};
