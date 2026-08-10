import assert from "node:assert/strict";
import test from "node:test";
import { createSlackPublisher } from "./slack.mjs";

const validEnv = {
  C_VAL_SLACK: "true",
  C_VAL_SLACK_WEBHOOK_URL:
    "https://hooks.slack.com/services/T00000000/B00000000/secret-value",
};

test("C-VAL Slack transport remains inert until both Slack environment keys exist", async () => {
  let calls = 0;
  const publisher = createSlackPublisher({
    env: { C_VAL_SLACK: "true" },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true };
    },
    logger: { warn() {} },
  });

  assert.equal(publisher.publish("체결 메모"), false);
  await publisher.flush();
  assert.equal(calls, 0);
});

test("C-VAL Slack transport sends a text fallback with optional Block Kit", async () => {
  const requests = [];
  const publisher = createSlackPublisher({
    env: validEnv,
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 200 };
    },
    logger: { warn() {} },
  });

  publisher.publish({
    text: "체결 메모 100.00",
    blocks: [{ type: "section", text: { type: "mrkdwn", text: "*100.00*" } }],
  });
  await publisher.flush();

  assert.deepEqual(requests, [
    {
      text: "체결 메모 100.00",
      blocks: [{ type: "section", text: { type: "mrkdwn", text: "*100.00*" } }],
    },
  ]);
});

test("C-VAL Slack transport enforces Slack's sustained one-message-per-channel interval", async () => {
  const requests = [];
  const sleeps = [];
  let time = 0;
  const publisher = createSlackPublisher({
    env: validEnv,
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 200 };
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

  assert.deepEqual(requests.map(({ text }) => text), ["첫 문장", "둘째 문장"]);
  assert.deepEqual(sleeps, [1_000]);
  assert.equal(publisher.status().minimumIntervalMs, 1_000);
});

test("C-VAL Slack transport honours Retry-After after a 429 response", async () => {
  const sleeps = [];
  let time = 0;
  const publisher = createSlackPublisher({
    env: validEnv,
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      headers: { get: (name) => (name === "retry-after" ? "3" : null) },
      text: async () => "rate_limited",
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

test("C-VAL Slack transport stops a queued publication after a terminal webhook response", async () => {
  const requests = [];
  let resolveResponse;
  const publisher = createSlackPublisher({
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
    status: 404,
    headers: { get: () => null },
    text: async () => "no_service",
  });
  await publisher.flush();

  assert.deepEqual(requests.map(({ text }) => text), ["폐기될 첫 문장"]);
  assert.equal(publisher.status().enabled, false);
  assert.equal(publisher.status().metrics.discarded, 1);
});

test("C-VAL Slack transport does not split an emoji at its text boundary", async () => {
  const requests = [];
  const publisher = createSlackPublisher({
    env: validEnv,
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 200 };
    },
    logger: { warn() {} },
  });

  publisher.publish(`${"가".repeat(3_999)}🚀`);
  await publisher.flush();

  assert.equal(Array.from(requests[0].text).length, 4_000);
  assert.equal(requests[0].text.endsWith("🚀"), true);
});
