import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
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

  return { broadcasts, handlers, io, socket };
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

test("ddong-meong 3 marks a backgrounded phone as paused before it disconnects", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongThreeExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "dummy",
    nickname: "숨은 사람",
    participantId: "participant-hidden",
  });
  sessionHandler({ action: "engagement", engagement: "paused" });

  assert.equal(broadcasts.at(-1)?.payload.activeSessions[0].engagement, "paused");
  assert.notEqual(broadcasts.at(-1)?.payload.activeSessions[0].pausedAt, null);
  assert.equal(broadcasts.at(-1)?.payload.activeSessions[0].pausedDurationMs, 0);

  handlers.get("disconnect")();
  assert.equal(broadcasts.at(-1)?.payload.archive[0].outcome, "backgrounded");
});

test("ddong-meong 3 resumes its shared elapsed clock after a pause", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongThreeExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "dummy",
    nickname: "돌아온 사람",
    participantId: "participant-resumed",
  });
  sessionHandler({ action: "engagement", engagement: "paused" });
  sessionHandler({ action: "engagement", engagement: "active" });

  const resumed = broadcasts.at(-1)?.payload.activeSessions[0];
  assert.equal(resumed.engagement, "active");
  assert.equal(resumed.pausedAt, null);
  assert.ok(resumed.pausedDurationMs >= 0);
});

test("ddong-meong 3 records stopped direct input separately from leaving", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongThreeExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "dummy",
    nickname: "멍한 사람",
    participantId: "participant-idle",
  });
  sessionHandler({ action: "engagement", engagement: "idle" });

  assert.equal(broadcasts.at(-1)?.payload.activeSessions[0].engagement, "idle");

  handlers.get("disconnect")();
  assert.equal(broadcasts.at(-1)?.payload.archive[0].outcome, "idle");
});

test("ddong-meong 3 accepts an unload beacon as an explicit leave", () => {
  const { broadcasts, handlers, io, socket } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongThreeExperiment.events.sessionIn,
  );
  const request = new EventEmitter();
  const response = {
    end() {},
    statusCode: 0,
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
  };

  request.method = "POST";
  request.url = "/3/disengagement";
  request.setEncoding = () => {};

  sessionHandler({
    action: "start",
    contentSlug: "dummy",
    nickname: "나가는 사람",
    participantId: "participant-leaving",
  });
  assert.equal(
    ddongMeongThreeExperiment.handleHttpRequest({
      io,
      request,
      response,
    }),
    true,
  );

  request.emit(
    "data",
    JSON.stringify({
      participantId: "participant-leaving",
      signal: "leaving",
      socketId: socket.id,
    }),
  );
  request.emit("end");

  assert.equal(response.statusCode, 204);
  assert.equal(broadcasts.at(-1)?.payload.archive[0].outcome, "left");
});

test("ddong-meong 3 screen cannot mutate session state", () => {
  const { broadcasts, handlers } = createHarness("screen");
  handlers.get(ddongMeongThreeExperiment.events.sessionIn)({
    action: "start",
  });
  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
});
