import assert from "node:assert/strict";
import test from "node:test";
import { ddongMeongThreeExperiment } from "./index.mjs";

function createHarness(role = "mobile") {
  const handlers = new Map();
  const broadcasts = [];
  const socket = {
    data: {},
    id: `ddong-3-${role}`,
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

  ddongMeongThreeExperiment.register({ io, socket });
  handlers.get(ddongMeongThreeExperiment.events.join)({ role });

  return { broadcasts, handlers, socket };
}

test("ddong-meong 3 joins its own isolated room", () => {
  const { socket } = createHarness();
  assert.deepEqual([...socket.rooms], ["experiment:ddong-meong:3"]);
});

test("ddong-meong 3 archives a named content session", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongThreeExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "private-room",
    nickname: "노라조",
    participantId: "participant-1",
  });
  sessionHandler({
    action: "update",
    phase: "releasing",
    interactionCount: 3,
  });
  sessionHandler({ action: "complete", outcome: "flushed" });

  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
  assert.equal(latest.archive[0].contentSlug, "private-room");
  assert.equal(latest.archive[0].interactionCount, 3);
  assert.equal(latest.archive[0].nickname, "노라조");
  assert.equal(latest.archive[0].outcome, "flushed");
});

test("ddong-meong 3 screen cannot mutate session state", () => {
  const { broadcasts, handlers } = createHarness("screen");
  handlers.get(ddongMeongThreeExperiment.events.sessionIn)({
    action: "start",
  });
  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
});
