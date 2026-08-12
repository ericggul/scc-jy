import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramPublisher } from "./telegram.mjs";

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

test("C-VAL Telegram transport remains inert until all three environment keys are valid", async () => {
  let calls = 0;
  const publisher = createTelegramPublisher({
    env: { C_VAL_TELEGRAM: "true", C_VAL_TELEGRAM_BOT_TOKEN: "123:token" },
    fetchImpl: async () => {
      calls += 1;
      return successfulTelegramResponse();
    },
    logger: { warn() {} },
  });

  assert.equal(publisher.publish("체결 알림"), false);
  await publisher.flush();
  assert.equal(calls, 0);
});

test("C-VAL Telegram transport sends a channel message through the Bot API", async () => {
  const requests = [];
  const publisher = createTelegramPublisher({
    env: validEnv,
    fetchImpl: async (url, request) => {
      requests.push({ url, body: JSON.parse(request.body) });
      return successfulTelegramResponse();
    },
    logger: { warn() {} },
  });

  publisher.publish({
    text: "<b>체결 알림</b> · 100.00",
    parseMode: "HTML",
    disableNotification: true,
  });
  await publisher.flush();

  assert.match(requests[0].url, /^https:\/\/api\.telegram\.org\/bot\d+:/);
  assert.deepEqual(requests[0].body, {
    chat_id: "@c_val_feed",
    text: "<b>체결 알림</b> · 100.00",
    disable_web_page_preview: true,
    parse_mode: "HTML",
    disable_notification: true,
  });
});

test("C-VAL Telegram transport enforces the sustained one-message-per-chat interval", async () => {
  const sleeps = [];
  let time = 0;
  const publisher = createTelegramPublisher({
    env: validEnv,
    fetchImpl: async () => successfulTelegramResponse(),
    now: () => time,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      time += milliseconds;
    },
    logger: { warn() {} },
  });

  publisher.publish("첫 문장");
  await publisher.flush();
  publisher.publish("둘째 문장");
  await publisher.flush();

  assert.deepEqual(sleeps, [1_000]);
  assert.equal(publisher.status().minimumIntervalMs, 1_000);
});

test("C-VAL Telegram transport honours a Bot API retry_after response", async () => {
  const sleeps = [];
  let time = 0;
  const publisher = createTelegramPublisher({
    env: validEnv,
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        error_code: 429,
        parameters: { retry_after: 3 },
      }),
    }),
    now: () => time,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      time += milliseconds;
    },
    logger: { warn() {} },
  });

  publisher.publish("첫 문장");
  await publisher.flush();
  publisher.publish("둘째 문장");
  await publisher.flush();

  assert.deepEqual(sleeps, [3_000]);
  assert.equal(publisher.status().metrics.rateLimited, 2);
});

test("C-VAL Telegram transport discards a queued successor after a terminal Bot API response", async () => {
  const requests = [];
  let resolveResponse;
  const publisher = createTelegramPublisher({
    env: validEnv,
    fetchImpl: (_url, request) => {
      requests.push(JSON.parse(request.body));
      return new Promise((resolve) => {
        resolveResponse = resolve;
      });
    },
    logger: { warn() {} },
  });

  publisher.publish("폐기될 첫 문장");
  await Promise.resolve();
  publisher.publish("전송되면 안 되는 둘째 문장");
  resolveResponse({
    ok: false,
    status: 403,
    json: async () => ({ ok: false, error_code: 403 }),
  });
  await publisher.flush();

  assert.deepEqual(requests.map(({ text }) => text), ["폐기될 첫 문장"]);
  assert.equal(publisher.status().enabled, false);
  assert.equal(publisher.status().metrics.discarded, 1);
});

test("C-VAL Telegram transport bounds text without splitting an emoji", async () => {
  const requests = [];
  const publisher = createTelegramPublisher({
    env: validEnv,
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return successfulTelegramResponse();
    },
    logger: { warn() {} },
  });

  publisher.publish(`${"가".repeat(4_095)}🚀`);
  await publisher.flush();

  assert.equal(Array.from(requests[0].text).length, 4_096);
  assert.equal(requests[0].text.endsWith("🚀"), true);
});
