export const cValIdleLifecycleTiming = Object.freeze({
  inactiveToClosingMs: 5_000,
  closingToResetMs: 120_000,
});

/**
 * Resolves the unattended-market transition without mutating the market.
 * Keep the two timing values above as the one place to retime this lifecycle.
 */
export function advanceCValIdleLifecycle({
  phase,
  engaged,
  now,
  inactiveAt = null,
  closingAt = null,
}) {
  if (engaged) {
    return { inactiveAt: null, closingAt: null, transition: null };
  }

  if (phase === "active") {
    const nextInactiveAt = inactiveAt ?? now;
    if (now - nextInactiveAt < cValIdleLifecycleTiming.inactiveToClosingMs) {
      return { inactiveAt: nextInactiveAt, closingAt: null, transition: null };
    }
    return {
      inactiveAt: nextInactiveAt,
      closingAt: now,
      transition: "close",
    };
  }

  if (phase === "closing-auction") {
    const nextClosingAt = closingAt ?? now;
    if (now - nextClosingAt < cValIdleLifecycleTiming.closingToResetMs) {
      return { inactiveAt: null, closingAt: nextClosingAt, transition: null };
    }
    return { inactiveAt: null, closingAt: null, transition: "reset" };
  }

  return { inactiveAt: null, closingAt: null, transition: null };
}
