import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelOrder,
  createOrderBook,
  getBestQuotes,
  submitOrder,
} from "./order-book.mjs";

function limit(id, traderId, side, priceTicks, quantity, submittedAt = 0) {
  return {
    id,
    traderId,
    participantType: "test",
    side,
    kind: "limit",
    priceTicks,
    quantity,
    submittedAt,
  };
}

test("price-time priority and partial fills are conserved", () => {
  const book = createOrderBook();
  submitOrder(book, limit("sell-1", "maker-1", "sell", 10_002, 100, 1));
  submitOrder(book, limit("sell-2", "maker-2", "sell", 10_002, 100, 2));
  const result = submitOrder(
    book,
    limit("buy-1", "taker", "buy", 10_002, 150, 3),
  );

  assert.deepEqual(
    result.executions.map(({ sellOrderId, quantity }) => ({
      sellOrderId,
      quantity,
    })),
    [
      { sellOrderId: "sell-1", quantity: 100 },
      { sellOrderId: "sell-2", quantity: 50 },
    ],
  );
  assert.equal(book.orders.get("sell-2").remaining, 50);
  assert.equal(result.order.remaining, 0);
});

test("a market order walks available levels and never rests", () => {
  const book = createOrderBook();
  submitOrder(book, limit("sell-1", "maker-1", "sell", 10_001, 100));
  submitOrder(book, limit("sell-2", "maker-2", "sell", 10_003, 100));
  const result = submitOrder(book, {
    id: "market-buy",
    traderId: "taker",
    participantType: "test",
    side: "buy",
    kind: "market",
    quantity: 250,
    submittedAt: 2,
  });

  assert.deepEqual(
    result.executions.map(({ priceTicks, quantity }) => ({
      priceTicks,
      quantity,
    })),
    [
      { priceTicks: 10_001, quantity: 100 },
      { priceTicks: 10_003, quantity: 100 },
    ],
  );
  assert.equal(result.order.remaining, 50);
  assert.equal(book.orders.has("market-buy"), false);
});

test("cancellation removes exactly the selected resting order", () => {
  const book = createOrderBook();
  submitOrder(book, limit("buy-1", "maker-1", "buy", 9_999, 100));
  assert.equal(cancelOrder(book, "buy-1")?.remaining, 100);
  assert.deepEqual(getBestQuotes(book), {
    bestBidTicks: null,
    bestAskTicks: null,
  });
  assert.equal(cancelOrder(book, "buy-1"), null);
});

test("a resting book remains uncrossed", () => {
  const book = createOrderBook();
  submitOrder(book, limit("buy-1", "buyer", "buy", 9_999, 100));
  submitOrder(book, limit("sell-1", "seller", "sell", 10_001, 100));
  assert.deepEqual(getBestQuotes(book), {
    bestBidTicks: 9_999,
    bestAskTicks: 10_001,
  });
});

