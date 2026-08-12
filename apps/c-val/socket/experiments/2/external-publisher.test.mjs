import assert from "node:assert/strict";
import test from "node:test";
import {
  cValExternalIntervalMs,
  createCValDiscordPublisher,
  presentCValExternalPublication,
} from "./external-publisher.mjs";

function activeSnapshot({
  revision = 1,
  change = 0,
  oneSecondMove = 0,
  price = 100 + change,
  low = price,
  high = price,
  realizedVolatilityBps = 0,
  activatedAt = 10_000,
  serverTime = activatedAt + revision * 50,
} = {}) {
  return {
    phase: "active",
    runId: "c-val-test-run",
    revision,
    activatedAt,
    serverTime,
    market: {
      index: price,
      changeFromOpenPercent: change,
      oneSecondMovePercent: oneSecondMove,
      oneSecondLow: low,
      oneSecondHigh: high,
      realizedVolatilityBps,
    },
  };
}

test("external publication is one parameterized Korean Discord utterance", () => {
  const publication = presentCValExternalPublication(
    activeSnapshot({ change: 3.2, oneSecondMove: 1.2, price: 103.2 }),
    7,
  );

  assert.equal(publication.content.includes("\n"), false);
  assert.equal(typeof publication.username, "string");
  assert.match(publication.content, /103\.20/);
  assert.match(publication.content, /\+1\.20%/);
  assert.equal(publication.content.includes("{"), false);
});

test("external publication keeps a stream memory: no immediate template or handle repeat", () => {
  const memory = {
    lastPublication: null,
    lastDirection: 0,
    recentTemplates: [],
    recentHandles: [],
  };
  const first = presentCValExternalPublication(
    activeSnapshot({ revision: 10, serverTime: 12_000, price: 102, oneSecondMove: 1.4 }),
    10,
    memory,
  );
  memory.lastPublication = first.publicationState;
  memory.lastDirection = first.marketDirection;
  memory.recentTemplates = [first.template];
  memory.recentHandles = [first.username];
  const second = presentCValExternalPublication(
    activeSnapshot({ revision: 11, serverTime: 12_250, price: 103, oneSecondMove: 1.8 }),
    11,
    memory,
  );

  assert.notEqual(second.template, first.template);
  assert.notEqual(second.username, first.username);
  assert.match(second.content, /103\.00/);
  assert.match(second.content, /\+1\.80%/);
});

test("fast market publication may carry a Unicode community reaction", () => {
  const publication = presentCValExternalPublication(
    activeSnapshot({ revision: 32, serverTime: 13_200, price: 108, oneSecondMove: 6.2 }),
    32,
  );

  assert.match(publication.content, /108\.00/);
  assert.match(publication.content, /\+6\.20%/);
  assert.match(publication.content, /(🔥|🚀|ㄷㄷ|ㅁㅊ|ㅋㅋ|와)$/);
});

test("execution speed selects a 200ms-to-5s requested Discord cadence", () => {
  assert.equal(cValExternalIntervalMs(activeSnapshot({ oneSecondMove: 0.01 })), 5_000);
  assert.equal(cValExternalIntervalMs(activeSnapshot({ oneSecondMove: 0.1 })), 2_000);
  assert.equal(cValExternalIntervalMs(activeSnapshot({ oneSecondMove: 0.3 })), 1_000);
  assert.equal(cValExternalIntervalMs(activeSnapshot({ oneSecondMove: 0.8 })), 400);
  assert.equal(cValExternalIntervalMs(activeSnapshot({ oneSecondMove: 2.1 })), 200);
  assert.equal(cValExternalIntervalMs(activeSnapshot({ oneSecondMove: -5.1 })), 200);
});

test("publisher is inert without an explicitly enabled valid Discord webhook", async () => {
  let calls = 0;
  const publisher = createCValDiscordPublisher({
    env: { C_VAL_DISCORD: "true" },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true };
    },
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ revision: 1, serverTime: 10_500 }));
  publisher.observe(activeSnapshot({ revision: 2, serverTime: 11_000 }));
  await publisher.flush();

  assert.equal(publisher.status().enabled, false);
  assert.equal(publisher.status().configured, false);
  assert.equal(calls, 0);
});

test("publisher follows execution speed from calm five-second cadence to fast 200ms cadence", async () => {
  const requests = [];
  const publisher = createCValDiscordPublisher({
    env: {
      C_VAL_DISCORD: "true",
      C_VAL_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 204 };
    },
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ revision: 1, serverTime: 14_950 }));
  publisher.observe(activeSnapshot({ revision: 2, serverTime: 15_000 }));
  await publisher.flush();
  publisher.observe(activeSnapshot({ revision: 3, serverTime: 15_200, price: 101.25, oneSecondMove: 5.1 }));
  publisher.observe(activeSnapshot({ revision: 4, serverTime: 15_250, price: 101.25, oneSecondMove: 5.1 }));
  await publisher.flush();
  publisher.observe(activeSnapshot({ revision: 5, serverTime: 15_400, price: 98.75, oneSecondMove: -5.1 }));
  await publisher.flush();

  assert.equal(requests.length, 3);
  assert.deepEqual(requests[0].allowed_mentions, { parse: [] });
  assert.equal(requests[0].content.includes("\n"), false);
  assert.match(requests[1].content, /101\.25/);
  assert.match(requests[1].content, /5\.10%/);
  assert.match(requests[2].content, /98\.75/);
  assert.match(requests[2].content, /5\.10%/);
  assert.ok(requests.every(({ username }) => typeof username === "string"));
});
