import {
  applyCompetitiveFirmsIntervention,
  createCompetitiveFirmsRuntime,
  firmIds,
  snapshotCompetitiveFirms,
  stepCompetitiveFirms,
  variableIds,
} from "./model.mjs";

const id = "network-system:competitive-firms";
const variantId = "competitive-firms";
const room = `experiment:network-system:${variantId}`;
const runtime = createCompetitiveFirmsRuntime();
let ioRef = null;

const events = {
  join: "network-system-competitive-firms:join",
  hello: "network-system-competitive-firms:hello",
  stateOut: "network-system-competitive-firms:state",
  interventionIn: "network-system-competitive-firms:intervention:in",
};

export function normalizeCompetitiveFirmsIntervention(payload = {}) {
  if (
    payload.kind === "management" &&
    firmIds.includes(payload.firmId) &&
    variableIds.includes(payload.variableId) &&
    Number.isFinite(payload.amount)
  ) {
    return {
      kind: "management",
      firmId: payload.firmId,
      variableId: payload.variableId,
      amount: Math.min(Math.max(payload.amount, -1), 1),
    };
  }

  return null;
}

export function canApplyCompetitiveFirmsIntervention(socketState, intervention) {
  return Boolean(
    socketState?.role === "screen" &&
      socketState.firmId &&
      intervention &&
      intervention.firmId === socketState.firmId,
  );
}

function broadcastState(io) {
  io.to(room).emit(events.stateOut, snapshotCompetitiveFirms(runtime));
}

setInterval(() => {
  stepCompetitiveFirms(runtime, Date.now(), 0.1);
  if (ioRef) broadcastState(ioRef);
}, 100).unref();

function register({ io, socket }) {
  ioRef = io;

  socket.on(events.join, ({ role, firmId, experimentSlug } = {}) => {
    if (experimentSlug !== variantId) return;
    socket.data[id] = {
      role: role === "controller" || role === "screen" ? role : "unknown",
      firmId: role === "screen" && firmIds.includes(firmId) ? firmId : null,
      variantId,
    };
    socket.join(room);
    socket.emit(events.hello, { state: snapshotCompetitiveFirms(runtime) });
  });

  socket.on(events.interventionIn, (payload = {}) => {
    if (!socket.rooms.has(room) || socket.data[id]?.role !== "screen") {
      return;
    }
    const intervention = normalizeCompetitiveFirmsIntervention(payload);
    if (!canApplyCompetitiveFirmsIntervention(socket.data[id], intervention)) return;
    applyCompetitiveFirmsIntervention(runtime, intervention, Date.now());
  });
}

export const networkSystemCompetitiveFirmsExperiment = {
  id,
  events,
  register,
};
