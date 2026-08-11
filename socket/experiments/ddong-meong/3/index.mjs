import { randomUUID } from "node:crypto";

const id = "ddong-meong-3";
const variantId = "3";
const room = `experiment:ddong-meong:${variantId}`;
const archiveLimit = 5_000;
const activeSessions = new Map();
const archive = [];

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

const disengagementPath = "/ddong-meong/3/disengagement";

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
}

function updateEngagement(socketId, engagement) {
  const current = activeSessions.get(socketId);
  if (!current) return false;
  if (engagement !== "active" && engagement !== "paused" && engagement !== "idle") {
    return false;
  }

  activeSessions.set(socketId, {
    ...current,
    engagement,
    updatedAt: Date.now(),
  });
  return true;
}

function disconnectOutcome(session) {
  if (session.engagement === "paused") return "backgrounded";
  if (session.engagement === "idle") return "idle";
  return "left";
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
    engagement: "active",
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
    outcome === "flushed" ||
      outcome === "left" ||
      outcome === "backgrounded" ||
      outcome === "idle"
      ? outcome
      : "completed",
  );
}

function receiveDisengagementSignal(io, payload) {
  const socketId = typeof payload.socketId === "string" ? payload.socketId : "";
  const session = activeSessions.get(socketId);
  if (!session || session.participantId !== payload.participantId) return false;

  if (payload.signal === "hidden") updateEngagement(socketId, "paused");
  if (payload.signal === "visible") updateEngagement(socketId, "active");
  if (payload.signal === "leaving") completeSession({ id: socketId }, "left");

  if (
    payload.signal !== "hidden" &&
    payload.signal !== "visible" &&
    payload.signal !== "leaving"
  ) {
    return false;
  }

  broadcastState(io);
  return true;
}

function writeBeaconResponse(response, statusCode) {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  });
  response.end();
}

function handleHttpRequest({ io, request, response }) {
  if (request.url !== disengagementPath) return false;

  if (request.method === "OPTIONS") {
    writeBeaconResponse(response, 204);
    return true;
  }

  if (request.method !== "POST") {
    writeBeaconResponse(response, 405);
    return true;
  }

  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    try {
      const accepted = receiveDisengagementSignal(io, JSON.parse(body));
      writeBeaconResponse(response, accepted ? 204 : 404);
    } catch {
      writeBeaconResponse(response, 400);
    }
  });
  request.on("error", () => writeBeaconResponse(response, 400));
  return true;
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
    if (payload.action === "engagement") {
      updateEngagement(socket.id, payload.engagement);
    }
    if (payload.action === "complete") completeSession(socket, payload.outcome);
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    const session = activeSessions.get(socket.id);
    if (session) completeSession(socket, disconnectOutcome(session));
    if (socket.data[id]?.variantId === variantId) broadcastState(io);
  });
}

export const ddongMeongThreeExperiment = {
  id,
  events,
  handleHttpRequest,
  register,
};
