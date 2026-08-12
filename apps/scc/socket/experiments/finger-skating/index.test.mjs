import assert from "node:assert/strict";
import test from "node:test";
import { fingerSkatingExperiment } from "./index.mjs";

function joinRoom(experimentSlug) {
  const handlers = new Map();
  const socket = {
    data: {},
    id: `socket-${experimentSlug}`,
    rooms: new Set(),
    emit() {},
    join(room) {
      this.rooms.add(room);
    },
    on(event, handler) {
      handlers.set(event, handler);
    },
  };
  const io = {
    sockets: { sockets: new Map([[socket.id, socket]]) },
    to() {
      return { emit() {} };
    },
  };

  fingerSkatingExperiment.register({ io, socket });
  handlers.get(fingerSkatingExperiment.events.join)({
    experimentSlug,
    role: "screen",
  });

  return socket.rooms;
}

test("finger-skating variants join isolated rooms", () => {
  const variantOneRooms = joinRoom("1");
  const variantTwoRooms = joinRoom("2");

  assert.ok(variantOneRooms.has("experiment:finger-skating:1"));
  assert.ok(variantTwoRooms.has("experiment:finger-skating:2"));
  assert.equal(
    [...variantOneRooms].some((room) => variantTwoRooms.has(room)),
    false,
  );
});
