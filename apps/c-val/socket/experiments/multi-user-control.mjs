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
 * Each phone contributes its signed displacement from C-VAL's neutral 0.5
 * condition. Those displacements add, then the resulting shared target is
 * bounded to the control range. This lets a second active phone intensify or
 * counter a first phone without allowing a single last packet to replace the
 * group state.
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

  const accumulated = (parameter) =>
    Number(
      clamp(
        0.5 + current.reduce((sum, control) => sum + control[parameter] - 0.5, 0),
        0,
        1,
      ).toFixed(6),
    );

  return {
    volatility: accumulated("volatility"),
    activity: accumulated("activity"),
    liquidity: accumulated("liquidity"),
    engaged: true,
    contributors: current.length,
    receivedAt: Math.max(...current.map(({ receivedAt }) => receivedAt)),
  };
}

export const cValHumanControlTiming = Object.freeze({
  staleAfterMs: DEFAULT_STALE_AFTER_MS,
});
