import assert from "node:assert/strict";
import test from "node:test";
import { fingerSkatingFieldOneExperiment } from "./index.mjs";

function createSocket(role) {
  const handlers = new Map();
  const emitted = [];
  const socket = {
    data: {},
    id: `socket-${role}`,
    rooms: new Set(),
    emit(event, payload) {
      emitted.push({ event, payload });
    },
    join(room) {
      this.rooms.add(room);
    },
    on(event, handler) {
      handlers.set(event, handler);
    },
  };
  return { emitted, handlers, socket };
}

test("field/1 relays only normalized mobile gesture samples", () => {
  const { emitted, handlers, socket } = createSocket("mobile");
  const roomEvents = [];
  const io = {
    sockets: { sockets: new Map([[socket.id, socket]]) },
    to(room) {
      return {
        emit(event, payload) {
          roomEvents.push({ event, payload, room });
        },
      };
    },
  };

  fingerSkatingFieldOneExperiment.register({ io, socket });
  handlers.get(fingerSkatingFieldOneExperiment.events.join)({ role: "mobile" });
  handlers.get(fingerSkatingFieldOneExperiment.events.gestureIn)({
    controlId: "like",
    pointerId: 4,
    phase: "move",
    x: 1.2,
    y: -0.2,
  });

  const gesture = roomEvents.find(
    ({ event }) => event === fingerSkatingFieldOneExperiment.events.gestureOut,
  );
  assert.equal(gesture.room, "experiment:finger-skating:field:1");
  assert.equal(gesture.payload.pointerId, 4);
  assert.equal(gesture.payload.controlId, "like");
  assert.equal(gesture.payload.phase, "move");
  assert.equal(gesture.payload.x, 1);
  assert.equal(gesture.payload.y, 0);
  assert.equal("hue" in gesture.payload, false);
  assert.ok(
    emitted.some(
      ({ event }) => event === fingerSkatingFieldOneExperiment.events.hello,
    ),
  );
});

test("field/1 rejects screen-originated gestures", () => {
  const { handlers, socket } = createSocket("screen");
  const roomEvents = [];
  const io = {
    sockets: { sockets: new Map([[socket.id, socket]]) },
    to(room) {
      return {
        emit(event, payload) {
          roomEvents.push({ event, payload, room });
        },
      };
    },
  };

  fingerSkatingFieldOneExperiment.register({ io, socket });
  handlers.get(fingerSkatingFieldOneExperiment.events.join)({ role: "screen" });
  handlers.get(fingerSkatingFieldOneExperiment.events.gestureIn)({
    pointerId: 1,
    phase: "move",
    x: 0.5,
    y: 0.5,
  });

  assert.equal(
    roomEvents.some(
      ({ event }) => event === fingerSkatingFieldOneExperiment.events.gestureOut,
    ),
    false,
  );
});
