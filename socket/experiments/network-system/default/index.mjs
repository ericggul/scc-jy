import {
  createRuntime,
  edgeIds,
  nodeIds,
  seedRuntime,
  changeWeight,
  snapshotRuntime,
  stepRuntime,
} from "./model.mjs";

const id = "network-system:default";
const room = "experiment:network-system:default";
const runtime = createRuntime();
let ioRef = null;

const events = {
  join: "network-system-default:join",
  hello: "network-system-default:hello",
  stateOut: "network-system-default:state",
  interventionIn: "network-system-default:intervention:in",
};

setInterval(() => {
  const snapshot = stepRuntime(runtime);
  ioRef?.to(room).emit(events.stateOut, snapshot);
}, 100).unref();

function register({ io, socket }) {
  ioRef = io;

  socket.on(events.join, ({ role } = {}) => {
    socket.data[id] = {
      role: role === "controller" || role === "screen" ? role : "unknown",
    };
    socket.join(room);
    socket.emit(events.hello, snapshotRuntime(runtime));
  });

  socket.on(events.interventionIn, (payload = {}) => {
    if (!socket.rooms.has(room) || socket.data[id]?.role !== "controller") return;

    if (payload.kind === "seed" && nodeIds.includes(payload.nodeId)) {
      seedRuntime(runtime, payload.nodeId);
    } else if (
      payload.kind === "weight" &&
      edgeIds.includes(payload.edgeId) &&
      Number.isFinite(payload.amount)
    ) {
      changeWeight(runtime, payload.edgeId, Math.min(Math.max(payload.amount, -0.1), 0.1));
    } else {
      return;
    }

    io.to(room).emit(events.stateOut, snapshotRuntime(runtime));
  });
}

export const networkSystemDefaultExperiment = { id, events, register };
