import assert from "node:assert/strict";
import test from "node:test";
import {
  createCValDiscordPublisher,
  presentCValExternalPublication,
} from "./external-publisher.mjs";

function activeSnapshot({ revision = 1, change = 0, oneSecondMove = 0 } = {}) {
  return {
    phase: "active",
    runId: "c-val-test-run",
    revision,
    market: {
      index: 100 + change,
      changeFromOpenPercent: change,
      oneSecondMovePercent: oneSecondMove,
    },
  };
}

test("external publication remains clearly marked as generated simulation", () => {
  const publication = presentCValExternalPublication(
    activeSnapshot({ change: 3.2, oneSecondMove: 0.8 }),
    "누적 체결 변화 급등 전환",
  );

  assert.match(publication.content, /자동 생성된 시뮬레이션 사회 반응/);
  assert.match(publication.content, /실제 증권·투자 판단/);
  assert.match(publication.content, /01 \/ /);
  assert.match(publication.content, /최근 1초: \+0\.80%/);
});

test("publisher is inert without an explicitly enabled valid Discord webhook", async () => {
  let calls = 0;
  const publisher = createCValDiscordPublisher({
    env: { C_VAL_2_EXTERNAL_PUBLISHER: "discord" },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true };
    },
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ revision: 1, change: 0 }));
  publisher.observe(activeSnapshot({ revision: 2, change: 3.5 }));
  await publisher.flush();

  assert.deepEqual(publisher.status(), { enabled: false, cooldownMs: 15_000 });
  assert.equal(calls, 0);
});

test("publisher sends one de-duplicated Korean publication after a real market transition", async () => {
  const requests = [];
  let time = 0;
  const publisher = createCValDiscordPublisher({
    env: {
      C_VAL_2_EXTERNAL_PUBLISHER: "discord",
      C_VAL_2_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 204 };
    },
    now: () => time,
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ revision: 1, change: 0 }));
  time = 20_000;
  publisher.observe(activeSnapshot({ revision: 2, change: 3.5, oneSecondMove: 0.7 }));
  publisher.observe(activeSnapshot({ revision: 3, change: 3.5, oneSecondMove: 0.7 }));
  await publisher.flush();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].username, "C-VAL 관측봇");
  assert.deepEqual(requests[0].allowed_mentions, { parse: [] });
  assert.match(requests[0].content, /급등/);
});

test("publisher honours its bounded cooldown even across additional transitions", async () => {
  let time = 0;
  const requests = [];
  const publisher = createCValDiscordPublisher({
    env: {
      C_VAL_2_EXTERNAL_PUBLISHER: "discord",
      C_VAL_2_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 204 };
    },
    now: () => time,
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ revision: 1, change: 0 }));
  time = 20_000;
  publisher.observe(activeSnapshot({ revision: 2, change: 3.5 }));
  time = 21_000;
  publisher.observe(activeSnapshot({ revision: 3, change: -3.5 }));
  await publisher.flush();

  assert.equal(requests.length, 1);
});
