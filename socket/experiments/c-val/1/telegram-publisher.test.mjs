import assert from "node:assert/strict";
import test from "node:test";
import {
  cValTelegramIntervalMs,
  createCValTelegramPublisher,
  presentCValTelegramPublication,
} from "./telegram-publisher.mjs";

function activeSnapshot({
  revision = 1,
  price = 100,
  dayMove = 0,
  low = price,
  high = price,
  volatility = 0,
  activatedAt = 10_000,
  serverTime = activatedAt + revision * 50,
} = {}) {
  return {
    phase: "active",
    runId: "c-val-telegram-test-run",
    revision,
    activatedAt,
    serverTime,
    market: {
      index: price,
      oneSecondMovePercent: dayMove,
      oneSecondLow: low,
      oneSecondHigh: high,
      realizedVolatilityBps: volatility,
    },
  };
}

const validEnv = {
  C_VAL_TELEGRAM: "true",
  C_VAL_TELEGRAM_BOT_TOKEN: "123456:ABCDEFGHIJKLMNOPQRSTUV",
  C_VAL_TELEGRAM_CHANNEL_ID: "@c_val_feed",
};

function successfulTelegramResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, result: { message_id: 1 } }),
  };
}

test("Telegram presentation is an execution-based silent channel bulletin", () => {
  const publication = presentCValTelegramPublication(
    activeSnapshot({ price: 104.2, dayMove: 4.2, low: 100, high: 104.2 }),
    8,
  );

  assert.match(publication.text, /104\.20/);
  assert.equal(publication.parseMode, "HTML");
  assert.equal(publication.disableNotification, true);
  assert.equal(publication.text.includes("오늘"), false);
  assert.equal(publication.text.includes("개장 대비"), false);
});

test("Telegram cadence keeps a two-second quiet pulse and a one-second sharp-move pulse", () => {
  assert.equal(cValTelegramIntervalMs(activeSnapshot({ dayMove: 0.01 })), 2_000);
  assert.equal(cValTelegramIntervalMs(activeSnapshot({ dayMove: 0.2 })), 1_500);
  assert.equal(cValTelegramIntervalMs(activeSnapshot({ dayMove: 0.75 })), 1_000);
  assert.equal(cValTelegramIntervalMs(activeSnapshot({ dayMove: -2 })), 1_000);
});

test("Telegram publisher has no network effect until enabled with valid Telegram credentials", async () => {
  let calls = 0;
  const publisher = createCValTelegramPublisher({
    env: { C_VAL_TELEGRAM: "true" },
    fetchImpl: async () => {
      calls += 1;
      return successfulTelegramResponse();
    },
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ serverTime: 20_000 }));
  await publisher.flush();
  assert.equal(publisher.status().enabled, false);
  assert.equal(calls, 0);
});

test("Telegram publisher projects fast executions at the one-second channel cadence", async () => {
  const requests = [];
  let time = 0;
  const publisher = createCValTelegramPublisher({
    env: validEnv,
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return successfulTelegramResponse();
    },
    now: () => time,
    sleep: async (milliseconds) => {
      time += milliseconds;
    },
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ revision: 1, serverTime: 11_000, price: 101, dayMove: 2 }));
  publisher.observe(activeSnapshot({ revision: 2, serverTime: 11_500, price: 102, dayMove: 2 }));
  publisher.observe(activeSnapshot({ revision: 3, serverTime: 12_000, price: 103, dayMove: 2 }));
  await publisher.flush();

  assert.equal(requests.length, 2);
  assert.match(requests[0].text, /101\.00/);
  assert.match(requests[1].text, /103\.00/);
  assert.equal(requests.every(({ parse_mode }) => parse_mode === "HTML"), true);
  assert.equal(requests.every(({ disable_notification }) => disable_notification), true);
});
