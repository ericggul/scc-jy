import assert from "node:assert/strict";
import test from "node:test";
import { ddongDitationOneExperiment } from "./index.mjs";

function createHarness(role = "mobile") {
  const handlers = new Map();
  const broadcasts = [];
  const socket = {
    data: {},
    id: `ddong-${role}`,
    rooms: new Set(),
    emit() {},
    join(joinedRoom) {
      this.rooms.add(joinedRoom);
    },
    on(event, handler) {
      handlers.set(event, handler);
    },
  };
  const io = {
    sockets: { sockets: new Map([[socket.id, socket]]) },
    to(targetRoom) {
      return {
        emit(event, payload) {
          broadcasts.push({ targetRoom, event, payload });
        },
      };
    },
  };

  ddongDitationOneExperiment.register({ io, socket });
  handlers.get(ddongDitationOneExperiment.events.join)({
    experimentSlug: "1",
    role,
  });

  return { broadcasts, handlers, socket };
}

test("ddong-ditation joins its isolated variant room", () => {
  const { socket } = createHarness();
  assert.deepEqual([...socket.rooms], ["experiment:ddong-ditation:1"]);
});

test("only a joined mobile can create and complete an anonymous session", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongDitationOneExperiment.events.sessionIn,
  );

  sessionHandler({ action: "start" });
  sessionHandler({ action: "update", phase: "releasing", cycleCount: 2 });
  sessionHandler({ action: "complete" });

  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
  assert.equal(latest.archive[0].cycleCount, 2);
  assert.equal(latest.archive[0].outcome, "completed");
  assert.equal("color" in latest.archive[0], false);
});

test("a screen cannot mutate session state", () => {
  const { broadcasts, handlers } = createHarness("screen");
  handlers.get(ddongDitationOneExperiment.events.sessionIn)({
    action: "start",
  });
  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
});
