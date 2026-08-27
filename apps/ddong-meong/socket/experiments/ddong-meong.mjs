import { randomUUID } from "node:crypto";

const id = "ddong-meong";
const room = "experiment:ddong-meong";
const archiveLimit = 5_000;
const archiveSnapshotRetentionMs = 7 * 24 * 60 * 60 * 1000;
const activeSessions = new Map();

const contents = {
  "morning-urgent": "모닝똥이 급한데",
  "emergency-chill": "급똥 싸고 칠링하기",
  "celebrity-applause": "유명해지면 똥을 싸도 박수쳐준다",
  "thick-poop-imagination": "굵은 똥이 나오는 상상",
  "constipation-dialogue": "변비와의 긴 대화",
  "five-minute-meeting": "중요한 미팅 5분 전 급똥",
  "poop-politics": "똥의 정치학",
  "bathroom-without-urge": "똥이 마렵지는 않지만 화장실은 가고 싶을 때",
  "who-pooped-on-my-head": "누가 내 머리에 똥 쌌어?",
  "inspiration-from-ddong-meong": "좋은 영감은 똥멍에서 출발한다",
  "boot-camp-poop": "훈련소에서 싸는 똥",
  "omakase-poop": "오마카세 먹은 후에 싸는 똥",
  "do-androids-ddong-meong": "안드로이드는 똥을 싸는가?",
  "ten-reasons-to-poop-meditate": "명상하면서 똥을 싸야 하는 10가지 이유",
};

const archive = [];

const events = {
  join: "ddong-meong:join",
  hello: "ddong-meong:hello",
  state: "ddong-meong:state",
  sessionIn: "ddong-meong:session:in",
};

const disengagementPath = "/disengagement";

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

function cleanOptionalText(value, maximumLength) {
  return cleanText(value, "", maximumLength);
}

function cleanContextAttributeName(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function cleanEntryContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const raw = value;
  const entryContext = {};
  for (const field of ["institution", "building", "floor", "gender"]) {
    const cleaned = cleanOptionalText(raw[field], 48);
    if (cleaned) entryContext[field] = cleaned;
  }

  const attributes = {};
  if (
    raw.attributes &&
    typeof raw.attributes === "object" &&
    !Array.isArray(raw.attributes)
  ) {
    Object.entries(raw.attributes)
      .slice(0, 12)
      .forEach(([key, attributeValue]) => {
        const cleanedKey = cleanContextAttributeName(key);
        const cleanedValue = cleanOptionalText(attributeValue, 48);
        if (cleanedKey && cleanedValue) attributes[cleanedKey] = cleanedValue;
      });
  }
  if (Object.keys(attributes).length > 0) entryContext.attributes = attributes;

  return entryContext;
}

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
    serverTime: Date.now(),
  };
}

function getSnapshot(io) {
  const dayKey = koreanDay();
  const recentArchive = archive.filter(
    (entry) => entry.endedAt >= Date.now() - archiveSnapshotRetentionMs,
  );
  const todayArchive = recentArchive.filter((entry) => entry.dayKey === dayKey);
  const todayParticipants = new Set(
    todayArchive.map((entry) => entry.participantId),
  );
  for (const session of activeSessions.values()) {
    todayParticipants.add(session.participantId);
  }

  return {
    activeSessions: [...activeSessions.values()],
    archive: recentArchive,
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
  const unfinishedPauseMs =
    session.pausedAt === null ? 0 : Math.max(0, endedAt - session.pausedAt);
  archive.unshift({
    contentSlug: session.contentSlug,
    contentTitle: session.contentTitle,
    dayKey: koreanDay(endedAt),
    entryContext: session.entryContext,
    id: randomUUID(),
    interactionCount: session.interactionCount,
    nickname: session.nickname,
    participantId: session.participantId,
    startedAt: session.startedAt,
    endedAt,
    durationMs: Math.max(
      0,
      endedAt - session.startedAt - session.pausedDurationMs - unfinishedPauseMs,
    ),
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

  const now = Date.now();
  const pausedAt =
    engagement === "paused"
      ? current.pausedAt ?? now
      : null;
  const pausedDurationMs =
    engagement === "paused" || current.pausedAt === null
      ? current.pausedDurationMs
      : current.pausedDurationMs + Math.max(0, now - current.pausedAt);

  activeSessions.set(socketId, {
    ...current,
    engagement,
    pausedAt,
    pausedDurationMs,
    updatedAt: now,
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
    : "morning-urgent";
  const now = Date.now();
  activeSessions.set(socket.id, {
    contentSlug,
    contentTitle: contents[contentSlug],
    entryContext: cleanEntryContext(payload.entryContext),
    engagement: "active",
    id: randomUUID(),
    interactionCount: 0,
    nickname: cleanText(payload.nickname, "이름 없는 사람", 16),
    participantId: cleanText(payload.participantId, socket.id, 80),
    pausedAt: null,
    pausedDurationMs: 0,
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
    payload.phase === "releasing" ||
    payload.phase === "overflowing"
      ? payload.phase
      : current.phase;
  const interactionCount = Number.isFinite(payload.interactionCount)
    ? Math.max(0, Math.min(9_999, Math.floor(payload.interactionCount)))
    : current.interactionCount;

  const now = Date.now();
  activeSessions.set(socket.id, {
    ...current,
    phase,
    interactionCount,
    startedAt:
      current.phase === "arriving" && phase === "breathing"
        ? now
        : current.startedAt,
    updatedAt: now,
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
      outcome === "idle" ||
      outcome === "overflowed"
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
    if (socket.data[id]) broadcastState(io);
  });
}

export const ddongMeongExperiment = {
  id,
  events,
  handleHttpRequest,
  register,
};
