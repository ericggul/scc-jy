import assert from "node:assert/strict";
import test from "node:test";
import {
  cValSlackIntervalMs,
  createCValSlackPublisher,
  presentCValSlackPublication,
} from "./slack-publisher.mjs";
import {
  cValSlackReportTemplates,
  renderCValSlackReport,
} from "./slack/reports.mjs";

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
    runId: "c-val-slack-test-run",
    revision,
    activatedAt,
    serverTime,
    market: {
      index: price,
      openingPrice: 100,
      oneSecondMovePercent: dayMove,
      oneSecondLow: low,
      oneSecondHigh: high,
      realizedVolatilityBps: volatility,
      changeFromOpenPercent: dayMove,
      fundamental: 102.5,
      bestBid: price - 0.1,
      bestAsk: price + 0.1,
      orderImbalance: 0.25,
      turnover: 7_500,
      spreadBps: 19.2,
      depth: 8_400,
      priceImpactBps: 1.25,
      submittedOrders: 250,
      cancelledOrders: 80,
    },
    parameters: { volatility: 0.78, activity: 0.72, liquidity: 0.3 },
    participants: [
      { type: "liquidity-provider", count: 8, restingOrders: 18 },
      { type: "fundamental", count: 6, restingOrders: 11 },
      { type: "trend", count: 6, restingOrders: 9 },
      { type: "noise", count: 6, restingOrders: 7 },
    ],
    recentOrders: [
      { side: "buy", kind: "market", quantity: 100, filled: 100 },
      { side: "buy", kind: "limit", quantity: 200, filled: 50 },
      { side: "sell", kind: "limit", quantity: 100, filled: 50 },
    ],
    recentTrades: [{}, {}, {}],
  };
}

const validEnv = {
  C_VAL_SLACK: "true",
  C_VAL_SLACK_WEBHOOK_URL:
    "https://hooks.slack.com/services/T00000000/B00000000/secret-value",
};

test("Slack presentation uses a long execution- and agent-based research report", () => {
  const publication = presentCValSlackPublication(
    activeSnapshot({ price: 104.2, dayMove: 4.2, low: 100, high: 104.2 }),
    8,
  );

  assert.match(publication.text, /104\.20/);
  assert.equal(publication.blocks[0].type, "section");
  assert.equal(publication.blocks.length, 1);
  assert.equal(publication.text.includes("*"), false);
  assert.equal(publication.blocks[0].text.type, "plain_text");
  assert.ok(publication.wordCount >= 100);
  assert.ok(publication.wordCount <= 200);
  assert.ok(publication.blocks[0].text.text.length <= 3_000);
  assert.match(publication.text, /유동성 공급자/);
  assert.match(publication.text, /불균형 \+25\.0%/);
  assert.match(publication.text, /유동성 공급자 18건/);
  assert.match(publication.text, /상위 5호가 8,400주/);
  assert.match(publication.text, /기초가치 102\.50/);
});

test("Slack reports use the one-second channel cadence across market conditions", () => {
  assert.equal(cValSlackIntervalMs(activeSnapshot({ dayMove: 0.01 })), 1_000);
  assert.equal(cValSlackIntervalMs(activeSnapshot({ dayMove: 0.2 })), 1_000);
  assert.equal(cValSlackIntervalMs(activeSnapshot({ dayMove: 0.75 })), 1_000);
  assert.equal(cValSlackIntervalMs(activeSnapshot({ dayMove: -2 })), 1_000);
});

test("Slack research catalog contains 120 distinct report frames within Slack limits", () => {
  assert.equal(cValSlackReportTemplates.length, 120);
  assert.equal(
    new Set(cValSlackReportTemplates.map((template) => template.id)).size,
    120,
  );
  const headlines = new Set();
  for (const [index, template] of cValSlackReportTemplates.entries()) {
    const publication = renderCValSlackReport(
      activeSnapshot({ revision: index + 1, price: 104.2, dayMove: 4.2 }),
      index + 1,
      template,
    );
    assert.ok(publication.wordCount >= 100);
    assert.ok(publication.wordCount <= 200);
    assert.ok(publication.blocks[0].text.text.length <= 3_000);
    assert.equal(publication.text.includes("*"), false);
    headlines.add(publication.text.split("\n", 1)[0]);
  }
  assert.equal(headlines.size, 120);
});

test("Slack publisher has no network effect until explicitly enabled with a valid webhook", async () => {
  let calls = 0;
  const publisher = createCValSlackPublisher({
    env: { C_VAL_SLACK: "true" },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true };
    },
    logger: { warn() {} },
  });

  publisher.observe(activeSnapshot({ serverTime: 20_000 }));
  await publisher.flush();
  assert.equal(publisher.status().enabled, false);
  assert.equal(calls, 0);
});

test("Slack publisher projects fast execution at its Slack-safe one-second cadence", async () => {
  const requests = [];
  const publisher = createCValSlackPublisher({
    env: validEnv,
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 200 };
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
  assert.ok(requests.every(({ blocks }) => Array.isArray(blocks)));
});
