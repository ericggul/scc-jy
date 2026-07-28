function sortedPrices(levels, descending) {
  return [...levels.keys()].sort((left, right) =>
    descending ? right - left : left - right,
  );
}

function bestPrice(book, side) {
  const prices = sortedPrices(
    side === "buy" ? book.bids : book.asks,
    side === "buy",
  );
  return prices[0] ?? null;
}

function levelMap(book, side) {
  return side === "buy" ? book.bids : book.asks;
}

function oppositeSide(side) {
  return side === "buy" ? "sell" : "buy";
}

function crosses(order, oppositePrice) {
  if (order.kind === "market") return true;
  return order.side === "buy"
    ? order.priceTicks >= oppositePrice
    : order.priceTicks <= oppositePrice;
}

function removeFromLevel(book, order) {
  const levels = levelMap(book, order.side);
  const queue = levels.get(order.priceTicks);
  if (!queue) return;
  const index = queue.findIndex(({ id }) => id === order.id);
  if (index >= 0) queue.splice(index, 1);
  if (queue.length === 0) levels.delete(order.priceTicks);
  book.orders.delete(order.id);
}

export function createOrderBook() {
  return {
    bids: new Map(),
    asks: new Map(),
    orders: new Map(),
    sequence: 0,
    executionSequence: 0,
  };
}

export function getBestQuotes(book) {
  return {
    bestBidTicks: bestPrice(book, "buy"),
    bestAskTicks: bestPrice(book, "sell"),
  };
}

export function submitOrder(book, input) {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const order = {
    id: input.id,
    traderId: input.traderId,
    participantType: input.participantType,
    side: input.side,
    kind: input.kind,
    priceTicks:
      input.kind === "limit" ? Math.max(1, Math.floor(input.priceTicks)) : null,
    quantity,
    remaining: quantity,
    submittedAt: input.submittedAt,
    initialDistanceTicks: input.initialDistanceTicks,
    sequence: book.sequence++,
  };
  const executions = [];
  const opposite = oppositeSide(order.side);

  while (order.remaining > 0) {
    const oppositePrice = bestPrice(book, opposite);
    if (oppositePrice === null || !crosses(order, oppositePrice)) break;
    const levels = levelMap(book, opposite);
    const queue = levels.get(oppositePrice);
    const maker = queue?.[0];
    if (!maker) {
      levels.delete(oppositePrice);
      continue;
    }

    const executedQuantity = Math.min(order.remaining, maker.remaining);
    order.remaining -= executedQuantity;
    maker.remaining -= executedQuantity;
    const buyOrder = order.side === "buy" ? order : maker;
    const sellOrder = order.side === "sell" ? order : maker;
    executions.push({
      id: `trade-${++book.executionSequence}`,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyerId: buyOrder.traderId,
      sellerId: sellOrder.traderId,
      priceTicks: maker.priceTicks,
      quantity: executedQuantity,
      takerSide: order.side,
      executedAt: input.submittedAt,
    });

    if (maker.remaining === 0) {
      queue.shift();
      book.orders.delete(maker.id);
      if (queue.length === 0) levels.delete(oppositePrice);
    }
  }

  if (order.remaining > 0 && order.kind === "limit") {
    const levels = levelMap(book, order.side);
    const queue = levels.get(order.priceTicks) ?? [];
    queue.push(order);
    levels.set(order.priceTicks, queue);
    book.orders.set(order.id, order);
  }

  return {
    order,
    executions,
    status:
      order.remaining === 0
        ? "filled"
        : order.kind === "market"
          ? executions.length > 0
            ? "partially-filled"
            : "unfilled"
          : executions.length > 0
            ? "partially-filled"
            : "resting",
  };
}

export function cancelOrder(book, orderId) {
  const order = book.orders.get(orderId);
  if (!order) return null;
  removeFromLevel(book, order);
  return order;
}

export function bookOrders(book) {
  return [...book.orders.values()];
}

export function bookSideOrderCount(book, side) {
  return [...levelMap(book, side).values()].reduce(
    (total, queue) => total + queue.length,
    0,
  );
}

function levelSnapshot(levels, descending, limit) {
  return sortedPrices(levels, descending)
    .slice(0, limit)
    .map((priceTicks) => {
      const queue = levels.get(priceTicks);
      return {
        priceTicks,
        quantity: queue.reduce((total, order) => total + order.remaining, 0),
        orderCount: queue.length,
      };
    });
}

export function snapshotOrderBook(book, levelLimit = 10) {
  return {
    bids: levelSnapshot(book.bids, true, levelLimit),
    asks: levelSnapshot(book.asks, false, levelLimit),
  };
}
