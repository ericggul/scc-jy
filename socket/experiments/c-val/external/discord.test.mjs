import assert from "node:assert/strict";
import test from "node:test";
import { createDiscordPublisher } from "./discord.mjs";

test("C-VAL Discord transport remains inert until both common environment keys exist", async () => {
  let calls = 0;
  const publisher = createDiscordPublisher({
    env: { C_VAL_DISCORD: "true" },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true };
    },
    logger: { warn() {} },
  });

  assert.equal(publisher.publish("첫 문장"), false);
  await publisher.flush();
  assert.equal(calls, 0);
});

test("C-VAL Discord transport sends a caller-selected webhook persona", async () => {
  const requests = [];
  const publisher = createDiscordPublisher({
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

  assert.equal(
    publisher.publish({ content: "첫 문장", username: "체결창" }),
    true,
  );
  await publisher.flush();

  assert.deepEqual(requests, [
    {
      content: "첫 문장",
      allowed_mentions: { parse: [] },
      username: "체결창",
    },
  ]);
});

test("C-VAL Discord transport preserves Unicode and bounds message content to Discord's limit", async () => {
  const requests = [];
  const publisher = createDiscordPublisher({
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

  publisher.publish({ content: `${"가".repeat(1_999)}🔥`, username: "평단비밀" });
  await publisher.flush();

  assert.equal(Array.from(requests[0].content).length, 2_000);
  assert.equal(requests[0].content.endsWith("🔥"), true);
});

test("C-VAL Discord transport honours the live webhook rate-limit window", async () => {
  const requests = [];
  const sleeps = [];
  let time = 0;
  const publisher = createDiscordPublisher({
    env: {
      C_VAL_DISCORD: "true",
      C_VAL_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return {
        ok: true,
        status: 204,
        headers: {
          get(name) {
            if (name === "x-ratelimit-remaining") return "0";
            if (name === "x-ratelimit-reset-after") return "0.5";
            return null;
          },
        },
      };
    },
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

  assert.deepEqual(requests.map(({ content }) => content), ["첫 문장", "둘째 문장"]);
  assert.deepEqual(sleeps, [500]);
  assert.deepEqual(publisher.status().rateLimit, {
    limit: null,
    remaining: 0,
    resetAfterMs: 500,
    bucket: null,
  });
});

test("C-VAL Discord transport spreads sends across a live non-exhausted bucket", async () => {
  const requests = [];
  const sleeps = [];
  let time = 0;
  const publisher = createDiscordPublisher({
    env: {
      C_VAL_DISCORD: "true",
      C_VAL_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return {
        ok: true,
        status: 204,
        headers: {
          get(name) {
            if (name === "x-ratelimit-limit") return "5";
            if (name === "x-ratelimit-remaining") return "4";
            if (name === "x-ratelimit-reset-after") return "1";
            return null;
          },
        },
      };
    },
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

  assert.deepEqual(requests.map(({ content }) => content), ["첫 문장", "둘째 문장"]);
  assert.deepEqual(sleeps, [200]);
});

test("C-VAL Discord transport keeps a 200 ms floor when a successful response omits headers", async () => {
  const sleeps = [];
  let time = 0;
  const publisher = createDiscordPublisher({
    env: {
      C_VAL_DISCORD: "true",
      C_VAL_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async () => ({ ok: true, status: 204, headers: { get: () => null } }),
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

  assert.deepEqual(sleeps, [200]);
});

test("C-VAL Discord transport drops a rate-limited stale message and resumes with the newer state", async () => {
  const requests = [];
  const sleeps = [];
  let time = 0;
  const publisher = createDiscordPublisher({
    env: {
      C_VAL_DISCORD: "true",
      C_VAL_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      if (requests.length === 1) {
        return {
          ok: false,
          status: 429,
          headers: { get: (name) => (name === "retry-after" ? "0.2" : null) },
          json: async () => ({ retry_after: 0.2 }),
        };
      }
      return { ok: true, status: 204, headers: { get: () => null } };
    },
    now: () => time,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      time += milliseconds;
    },
    logger: { warn() {} },
  });

  publisher.publish("급변 첫 문장");
  await publisher.flush();
  publisher.publish("회복 뒤 문장");
  await publisher.flush();

  assert.equal(publisher.status().enabled, true);
  assert.equal(publisher.status().metrics.rateLimited, 1);
  assert.equal(publisher.status().metrics.sent, 1);
  assert.deepEqual(sleeps, [200]);
  assert.deepEqual(requests.map(({ content }) => content), [
    "급변 첫 문장",
    "회복 뒤 문장",
  ]);
});

test("C-VAL Discord transport stops and clears work after a terminal webhook response", async () => {
  let calls = 0;
  const publisher = createDiscordPublisher({
    env: {
      C_VAL_DISCORD: "true",
      C_VAL_DISCORD_WEBHOOK_URL:
        "https://discord.com/api/webhooks/123456/token-value",
    },
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 400, headers: { get: () => null }, json: async () => ({}) };
    },
    logger: { warn() {} },
  });

  publisher.publish("첫 문장");
  await publisher.flush();
  assert.equal(publisher.publish("둘째 문장"), false);
  assert.equal(calls, 1);
  assert.equal(publisher.status().terminalFailure, 400);
  assert.equal(publisher.status().lastResponseStatus, 400);
  assert.equal(publisher.status().metrics.discarded, 1);
});
