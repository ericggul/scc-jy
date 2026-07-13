import {
  applyPopulationIntervention,
  createPopulationRuntime,
  populationParameterRanges,
  populationStateIds,
  resetPopulationRuntime,
  snapshotPopulationRuntime,
  stepPopulationRuntime,
} from "./network-system-population-model.mjs";

const id = "network-system";
const variantId = "population";
const room = `experiment:${id}:${variantId}`;
const runtime = createPopulationRuntime();
let ioRef = null;
const realMillisecondsPerYear = 1_000;
let nextYearAt = Date.now() + realMillisecondsPerYear;

const events = {
  join: "network-system-population:join",
  hello: "network-system-population:hello",
  stateOut: "network-system-population:state",
  interventionIn: "network-system-population:intervention:in",
  resetIn: "network-system-population:reset:in",
};

function normalizeIntervention(payload = {}) {
  if (
    payload.kind === "population" &&
    populationStateIds.includes(payload.state) &&
    Number.isFinite(payload.amount)
  ) {
    return { kind: "population", state: payload.state, amount: payload.amount };
  }
  if (
    payload.kind === "parameter" &&
    Object.hasOwn(populationParameterRanges, payload.parameter) &&
    Number.isFinite(payload.amount)
  ) {
    return { kind: "parameter", parameter: payload.parameter, amount: payload.amount };
  }
  return null;
}

function broadcastState(io) {
  io.to(room).emit(events.stateOut, snapshotPopulationRuntime(runtime));
}

setInterval(() => {
  const now = Date.now();
  let advanced = false;
  while (now >= nextYearAt) {
    stepPopulationRuntime(runtime, nextYearAt);
    nextYearAt += realMillisecondsPerYear;
    advanced = true;
  }
  if (advanced && ioRef) broadcastState(ioRef);
}, 100).unref();

function register({ io, socket }) {
  ioRef = io;

  socket.on(events.join, ({ role, experimentSlug } = {}) => {
    if (experimentSlug !== variantId) return;
    socket.data[id] = {
      variantId,
      role: role === "controller" || role === "screen" ? role : "unknown",
    };
    socket.join(room);
    socket.emit(events.hello, snapshotPopulationRuntime(runtime));
  });

  socket.on(events.interventionIn, (payload = {}) => {
    if (!socket.rooms.has(room) || socket.data[id]?.role !== "controller") return;
    const intervention = normalizeIntervention(payload);
    if (!intervention) return;
    if (applyPopulationIntervention(runtime, intervention, Date.now())) broadcastState(io);
  });

  socket.on(events.resetIn, () => {
    if (!socket.rooms.has(room) || socket.data[id]?.role !== "controller") return;
    const now = Date.now();
    resetPopulationRuntime(runtime, now);
    nextYearAt = now + realMillisecondsPerYear;
    broadcastState(io);
  });
}

export const networkSystemPopulationExperiment = { id, events, register };
