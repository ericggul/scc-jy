import {
  cValModelTiming,
  createCValRuntime,
  orientationToCValParameters,
  setCValOrientation,
  snapshotCValRuntime,
  stepCValRuntime,
} from "./model.mjs";
import { cValCalibration } from "./calibration.mjs";

function participantTotals(runtime) {
  return runtime.participants.reduce(
    (totals, participant) => ({
      cash: totals.cash + participant.cash,
      inventory: totals.inventory + participant.inventory,
    }),
    { cash: 0, inventory: 0 },
  );
}

/**
 * This is the only boundary between the generic gesture harness and the
 * current C-VAL market implementation. It calls the production model directly;
 * no price, order, liquidity, or participant equations are duplicated.
 */
export const cValShakeSystemAdapter = {
  id: "c-val-1-production-model-v1",
  tickIntervalMs: cValModelTiming.broadcastIntervalMs,
  marketDayMs:
    1_000 / cValCalibration.timing.marketDaysPerRealSecond,
  releaseTailMs:
    cValModelTiming.signalHoldMs +
    cValModelTiming.signalReleaseMs +
    500,

  mapOrientation(orientation) {
    return orientationToCValParameters(orientation);
  },

  create({ startTime, marketSeed }) {
    const runtime = createCValRuntime(
      startTime,
      "c-val-1-shake-harness",
      marketSeed,
    );
    return {
      runtime,
      initialTotals: participantTotals(runtime),
    };
  },

  applyOrientation(runtime, orientation, receivedAt) {
    setCValOrientation(runtime, orientation, receivedAt);
  },

  step(runtime, now) {
    stepCValRuntime(
      runtime,
      now,
      cValModelTiming.broadcastIntervalMs / 1_000,
    );
  },

  observe(runtime) {
    return {
      parameters: { ...runtime.parameters },
      effectiveVolatility: runtime.volatilityRegime,
      price: runtime.market.index,
      openingPrice: runtime.market.openingPrice,
      fundamental: runtime.market.fundamental,
      depth: runtime.market.depth,
      bestBid: runtime.market.bestBid,
      bestAsk: runtime.market.bestAsk,
      submittedOrders: runtime.market.submittedOrders,
      cancelledOrders: runtime.market.cancelledOrders,
      executions: runtime.market.executions,
      marketValues: Object.values(runtime.market),
    };
  },

  finish(runtime, initialTotals) {
    const finalTotals = participantTotals(runtime);
    const snapshot = snapshotCValRuntime(runtime);
    return {
      cashDrift: finalTotals.cash - initialTotals.cash,
      inventoryDrift: finalTotals.inventory - initialTotals.inventory,
      restingOrders: runtime.book.orders.size,
      snapshotBytes: Buffer.byteLength(JSON.stringify(snapshot)),
      maximumRestingOrders:
        cValCalibration.safety.maximumBookOrders,
      maximumSnapshotBytes:
        cValCalibration.safety.maximumSnapshotBytes,
      cashTolerance:
        Math.max(Math.abs(initialTotals.cash), 1) * Number.EPSILON,
      priceComesFromLastExecution:
        runtime.market.index === runtime.lastTradeTicks * 0.01,
    };
  },
};

