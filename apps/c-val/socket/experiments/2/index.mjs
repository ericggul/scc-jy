import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  cValModelTiming,
  createCValRuntime,
  resetCValRuntime,
  setCValHumanControl,
  snapshotCValRuntime,
  stepCValRuntime,
} from "./model.mjs";
import {
  clearCValDiagnostics,
  createCValDiagnostics,
  flushCValDiagnostics,
  observeCValDiagnostics,
} from "./diagnostics.mjs";
import {
  aggregateCValHumanControls,
  normalizeCValHumanControl,
} from "./multi-user-control.mjs";
import { createCValDiscordPublisher } from "./external-publisher.mjs";
import { createCValSlackPublisher } from "./slack-publisher.mjs";
import { createCValTelegramPublisher } from "./telegram-publisher.mjs";

const familyId = "c-val";
const version = "2";
const id = `${familyId}:${version}`;
export const cValTwoRoom = `experiment:${familyId}:${version}`;
const clients = new Map();
const humanControls = new Map();
const runtime = createCValRuntime();
const diagnostics = createCValDiagnostics();
let externalPublisher = null;
let externalSlackPublisher = null;
let externalTelegramPublisher = null;
let ioRef = null;

const events = {
  join: "c-val-2:join",
  hello: "c-val-2:hello",
  presence: "c-val-2:presence",
  stateOut: "c-val-2:state",
  humanControlIn: "c-val-2:human-control:in",
  sensorTraceIn: "c-val-2:sensor-trace:in",
  recordingCommandIn: "c-val-2:recording-command:in",
  recordingCommandOut: "c-val-2:recording-command:out",
  recordingStatusIn: "c-val-2:recording-status:in",
  recordingStatusOut: "c-val-2:recording-status:out",
  humanControlResetOut: "c-val-2:human-control-reset:out",
  resetIn: "c-val-2:reset:in",
};

const TRACE_EVENT_LIMIT = 6_000;
const TRACE_DURATION_LIMIT_MS = 65_000;

// TEMPORARY RESEARCH INSTRUMENTATION. Development-only, inactive unless the
// controller explicitly starts a recording, and removable after calibration.
function normalizeRecordingCommand(payload = {}) {
  if (payload.action === "stop") return { action: "stop" };
  if (
    payload.action === "start" &&
    Number.isFinite(payload.durationMs) &&
    payload.durationMs >= 5_000 &&
    payload.durationMs <= 60_000
  ) {
    return { action: "start", durationMs: Math.round(payload.durationMs) };
  }
  return null;
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function normalizeTraceVector(value = {}) {
  return {
    x: finiteOrNull(value.x),
    y: finiteOrNull(value.y),
    z: finiteOrNull(value.z),
  };
}

function normalizeTraceRotation(value = {}) {
  return {
    alpha: finiteOrNull(value.alpha),
    beta: finiteOrNull(value.beta),
    gamma: finiteOrNull(value.gamma),
  };
}

function normalizeSensorTrace(payload = {}) {
  if (
    payload.schemaVersion !== 2 ||
    payload.kind !== "browser-device-motion-orientation" ||
    !Number.isFinite(payload.durationMs) ||
    payload.durationMs <= 0 ||
    payload.durationMs > TRACE_DURATION_LIMIT_MS ||
    !Array.isArray(payload.orientationEvents) ||
    !Array.isArray(payload.motionEvents) ||
    payload.orientationEvents.length > TRACE_EVENT_LIMIT ||
    payload.motionEvents.length > TRACE_EVENT_LIMIT
  ) {
    return null;
  }

  const orientationEvents = payload.orientationEvents.map((event, index) => ({
    id: `orientation-${index + 1}`,
    tMs: finiteOrNull(event.tMs),
    absolute: Boolean(event.absolute),
    alpha: finiteOrNull(event.alpha),
    beta: finiteOrNull(event.beta),
    gamma: finiteOrNull(event.gamma),
  }));
  const motionEvents = payload.motionEvents.map((event, index) => ({
    id: `motion-${index + 1}`,
    tMs: finiteOrNull(event.tMs),
    intervalMs: finiteOrNull(event.intervalMs),
    acceleration: normalizeTraceVector(event.acceleration),
    accelerationIncludingGravity: normalizeTraceVector(
      event.accelerationIncludingGravity,
    ),
    rotationRate: normalizeTraceRotation(event.rotationRate),
  }));
  if (
    orientationEvents.some(
      (event) =>
        event.tMs === null ||
        event.alpha === null ||
        event.beta === null ||
        event.gamma === null,
    ) ||
    motionEvents.some((event) => event.tMs === null)
  ) {
    return null;
  }

  return {
    schemaVersion: 2,
    kind: "browser-device-motion-orientation",
    profile:
      typeof payload.profile === "string"
        ? payload.profile.slice(0, 80)
        : "recorded-c-val-2",
    provenance: {
      type: "recorded",
      recordedAt:
        typeof payload.provenance?.recordedAt === "string"
          ? payload.provenance.recordedAt
          : new Date().toISOString(),
    },
    durationMs: Number(payload.durationMs),
    orientationEvents,
    motionEvents,
  };
}

async function saveSensorTrace(payload) {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "sensor recording is development-only" };
  }
  const trace = normalizeSensorTrace(payload);
  if (!trace) return { ok: false, error: "invalid sensor trace" };
  const directory = resolve(process.cwd(), "recordings", "c-val", "2");
  const fileName = `author-shake-${Date.now()}.json`;
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, fileName),
    `${JSON.stringify(trace, null, 2)}\n`,
    "utf8",
  );
  return { ok: true, fileName };
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
  setCValHumanControl(
    runtime,
    aggregateCValHumanControls(humanControls, now),
    now,
  );
  stepCValRuntime(runtime, now, cValModelTiming.broadcastIntervalMs / 1000);
  const activeClientCount =
    ioRef?.sockets.adapter.rooms.get(cValTwoRoom)?.size ?? 0;
  if (activeClientCount > 0) {
    const state = broadcastState(ioRef);
    observeCValDiagnostics(diagnostics, state);
    flushCValDiagnostics(diagnostics, now);
    externalPublisher?.observe(state);
    externalSlackPublisher?.observe(state);
    externalTelegramPublisher?.observe(state);
  } else {
    clearCValDiagnostics(diagnostics, now);
  }
}, cValModelTiming.broadcastIntervalMs).unref();

function register({ io, socket }) {
  ioRef = io;
  externalPublisher ??= createCValDiscordPublisher();
  externalSlackPublisher ??= createCValSlackPublisher();
  externalTelegramPublisher ??= createCValTelegramPublisher();

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

  socket.on(events.humanControlIn, (payload = {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(cValTwoRoom)
    ) {
      return;
    }
    const now = Date.now();
    const control = normalizeCValHumanControl(payload, now);
    if (!control) return;
    humanControls.set(socket.id, control);
    setCValHumanControl(
      runtime,
      aggregateCValHumanControls(humanControls, now),
      now,
    );
  });

  socket.on(events.sensorTraceIn, async (payload = {}, acknowledge = () => {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(cValTwoRoom)
    ) {
      acknowledge({ ok: false, error: "mobile role required" });
      return;
    }
    try {
      acknowledge(await saveSensorTrace(payload));
    } catch (error) {
      acknowledge({
        ok: false,
        error: error instanceof Error ? error.message : "unable to save trace",
      });
    }
  });

  socket.on(
    events.recordingCommandIn,
    (payload = {}, acknowledge = () => {}) => {
      if (
        socket.data[id]?.role !== "controller" ||
        !socket.rooms.has(cValTwoRoom)
      ) {
        acknowledge({ ok: false, error: "controller role required" });
        return;
      }
      const command = normalizeRecordingCommand(payload);
      if (!command) {
        acknowledge({ ok: false, error: "use RECORD 30, RECORD 60, or STOP" });
        return;
      }
      const mobileCount = [...io.sockets.sockets.values()].filter(
        (candidate) =>
          candidate.rooms.has(cValTwoRoom) &&
          candidate.data[id]?.role === "mobile",
      ).length;
      if (mobileCount === 0) {
        acknowledge({ ok: false, error: "no C-VAL 2 mobile connected" });
        return;
      }
      io.to(cValTwoRoom).emit(events.recordingCommandOut, command);
      acknowledge({ ok: true, mobileCount });
    },
  );

  socket.on(events.recordingStatusIn, (payload = {}) => {
    if (
      socket.data[id]?.role !== "mobile" ||
      !socket.rooms.has(cValTwoRoom)
    ) {
      return;
    }
    const allowedStatuses = new Set(["started", "saving", "saved", "error"]);
    if (!allowedStatuses.has(payload.status) || typeof payload.message !== "string") {
      return;
    }
    const status = {
      status: payload.status,
      message: payload.message.slice(0, 160),
      mobileId: socket.id,
    };
    for (const candidate of io.sockets.sockets.values()) {
      if (
        candidate.rooms.has(cValTwoRoom) &&
        candidate.data[id]?.role === "controller"
      ) {
        candidate.emit(events.recordingStatusOut, status);
      }
    }
  });

  socket.on(events.resetIn, () => {
    const role = socket.data[id]?.role;
    if (
      (role !== "controller" && role !== "mobile") ||
      !socket.rooms.has(cValTwoRoom)
    ) {
      return;
    }
    const now = Date.now();
    humanControls.clear();
    resetCValRuntime(runtime, now);
    clearCValDiagnostics(diagnostics, now);
    io.to(cValTwoRoom).emit(events.humanControlResetOut);
    broadcastState(io);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    humanControls.delete(socket.id);
    if (socket.data[id]?.version === version) broadcastPresence(io);
  });
}

export const cValTwoExperiment = {
  id,
  version,
  events,
  register,
};
