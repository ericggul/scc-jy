import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { ddongMeongExperiment } from "./ddong-meong.mjs";

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

  ddongMeongExperiment.register({ io, socket });
  handlers.get(ddongMeongExperiment.events.join)({ role });

  return { broadcasts, handlers, io, socket };
}

test("ddong-meong joins its own isolated room", () => {
  const { socket } = createHarness();
  assert.deepEqual([...socket.rooms], ["experiment:ddong-meong"]);
});

test("ddong-meong archives a named content session", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "celebrity-applause",
    entryContext: {
      attributes: { wing: "east" },
      building: "n25",
      floor: "2",
      institution: "kaist",
    },
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
  assert.equal(latest.archive[0].contentSlug, "celebrity-applause");
  assert.equal(latest.archive[0].interactionCount, 3);
  assert.equal(latest.archive[0].nickname, "노라조");
  assert.equal(latest.archive[0].outcome, "flushed");
  assert.deepEqual(latest.archive[0].entryContext, {
    attributes: { wing: "east" },
    building: "n25",
    floor: "2",
    institution: "kaist",
  });
});

test("ddong-meong registers each proverb content with its exact title", () => {
  const proverbContents = [
    ["dog-poop-remedy", "개똥도 약에 쓰려면 없다"],
    [
      "before-after-poop",
      "똥 누러 갈 적 마음 다르고, 올 적 마음 다르다",
    ],
    ["muddy-dog-husk", "똥 묻은 개가 겨 묻은 개 나무란다"],
  ];

  for (const [contentSlug, contentTitle] of proverbContents) {
    const { broadcasts, handlers } = createHarness();
    const sessionHandler = handlers.get(
      ddongMeongExperiment.events.sessionIn,
    );
    sessionHandler({
      action: "start",
      contentSlug,
      nickname: "속담 사람",
      participantId: `participant-${contentSlug}`,
    });

    assert.equal(
      broadcasts.at(-1)?.payload.activeSessions[0].contentTitle,
      contentTitle,
    );
    sessionHandler({ action: "complete", outcome: "completed" });
  }
});

test("ddong-meong keeps optional location fields without requiring a full address", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "morning-urgent",
    entryContext: {
      attributes: {
        "Queue Side": "  east  ",
        ignored: ["not-a-string"],
      },
      building: "  n25  ",
      gender: "women",
      institution: "kaist",
    },
    nickname: "위치 있는 사람",
    participantId: "participant-location",
  });

  assert.deepEqual(broadcasts.at(-1)?.payload.activeSessions[0].entryContext, {
    attributes: { "queue-side": "east" },
    building: "n25",
    gender: "women",
    institution: "kaist",
  });
});

test("ddong-meong marks a backgrounded phone as paused before it disconnects", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "morning-urgent",
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

test("ddong-meong resumes its shared elapsed clock after a pause", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "morning-urgent",
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

test("ddong-meong records stopped direct input separately from leaving", () => {
  const { broadcasts, handlers } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongExperiment.events.sessionIn,
  );

  sessionHandler({
    action: "start",
    contentSlug: "morning-urgent",
    nickname: "멍한 사람",
    participantId: "participant-idle",
  });
  sessionHandler({ action: "engagement", engagement: "idle" });

  assert.equal(broadcasts.at(-1)?.payload.activeSessions[0].engagement, "idle");

  handlers.get("disconnect")();
  assert.equal(broadcasts.at(-1)?.payload.archive[0].outcome, "idle");
});

test("ddong-meong accepts an unload beacon as an explicit leave", () => {
  const { broadcasts, handlers, io, socket } = createHarness();
  const sessionHandler = handlers.get(
    ddongMeongExperiment.events.sessionIn,
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
  request.url = "/disengagement";
  request.setEncoding = () => {};

  sessionHandler({
    action: "start",
    contentSlug: "morning-urgent",
    nickname: "나가는 사람",
    participantId: "participant-leaving",
  });
  assert.equal(
    ddongMeongExperiment.handleHttpRequest({
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

test("ddong-meong screen cannot mutate session state", () => {
  const { broadcasts, handlers } = createHarness("screen");
  handlers.get(ddongMeongExperiment.events.sessionIn)({
    action: "start",
  });
  const latest = broadcasts.at(-1)?.payload;
  assert.equal(latest.activeSessions.length, 0);
});
