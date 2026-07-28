import assert from "node:assert/strict";
import test from "node:test";
import { ddongDitationTwoExperiment } from "./index.mjs";

function createHarness(role = "mobile") {
  const handlers = new Map();
  const broadcasts = [];
  const socket = {
    data: {},
    id: `ddong-2-${role}`,
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

  ddongDitationTwoExperiment.register({ io, socket });
  handlers.get(ddongDitationTwoExperiment.events.join)({ role });

  return { broadcasts, handlers, socket };
}

test("ddong-ditation 2 joins its own isolated room", () => {
  const { socket } = createHarness();
  assert.deepEqual([...socket.rooms], ["experiment:ddong-ditation:2"]);
});

test("ddong-ditation 2 completes its own anonymous session", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongDitationTwoExperiment.events.sessionIn,
  );

  sessionHandler({ action: "start" });
  sessionHandler({ action: "update", phase: "releasing", cycleCount: 3 });
  sessionHandler({ action: "complete" });

  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
  assert.equal(latest.archive[0].cycleCount, 3);
  assert.equal(latest.archive[0].outcome, "completed");
});

test("ddong-ditation 2 screen cannot mutate session state", () => {
  const { broadcasts, handlers } = createHarness("screen");
  handlers.get(ddongDitationTwoExperiment.events.sessionIn)({
    action: "start",
  });
  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
});
