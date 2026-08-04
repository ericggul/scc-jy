const DEFAULT_STALE_AFTER_MS = 450;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function finite(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

export function normalizeCValHumanControl(payload = {}, receivedAt = Date.now()) {
  const volatility = finite(payload.volatility);
  const activity = finite(payload.activity);
  const liquidity = finite(payload.liquidity);
  if (
    volatility === null ||
    activity === null ||
    liquidity === null
  ) {
    return null;
  }
  return {
    volatility: clamp(volatility, 0, 1),
    activity: clamp(activity, 0, 1),
    liquidity: clamp(liquidity, 0, 1),
    engaged: Boolean(payload.engaged),
    receivedAt,
  };
}

/**
 * Every active phone contributes the same direct V/A/L target. Multiple phones
 * use one transparent rule: the arithmetic mean for all three conditions.
 */
export function aggregateCValHumanControls(
  controls,
  now = Date.now(),
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
) {
  const current = [...controls.values()].filter(
    (control) =>
      control.engaged &&
      now - control.receivedAt >= 0 &&
      now - control.receivedAt <= staleAfterMs,
  );
  if (current.length === 0) {
    return {
      volatility: 0.5,
      activity: 0.5,
      liquidity: 0.5,
      engaged: false,
      contributors: 0,
      receivedAt: now,
    };
  }

  return {
    volatility:
      current.reduce((sum, { volatility }) => sum + volatility, 0) /
      current.length,
    activity:
      current.reduce((sum, { activity }) => sum + activity, 0) /
      current.length,
    liquidity:
      current.reduce((sum, { liquidity }) => sum + liquidity, 0) /
      current.length,
    engaged: true,
    contributors: current.length,
    receivedAt: Math.max(...current.map(({ receivedAt }) => receivedAt)),
  };
}

export const cValHumanControlTiming = Object.freeze({
  staleAfterMs: DEFAULT_STALE_AFTER_MS,
});
