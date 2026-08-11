const C_VAL_SOCIAL_CADENCE_QUIET_MS = 400;
const C_VAL_SOCIAL_CADENCE_EXTREME_MS = 30;
const C_VAL_SOCIAL_CADENCE_EXTREME_PERCENT = 30;
const C_VAL_SOCIAL_CADENCE_EASE_OUT_EXPONENT = 2.2;

/** Shared continuous C-VAL clock for observer-facing social streams. */
export function cValSocialAdmissionIntervalMs(oneSecondMovePercent: number) {
  const magnitude = Math.max(
    0,
    Math.abs(Number.isFinite(oneSecondMovePercent) ? oneSecondMovePercent : 0),
  );
  const normalizedMove = Math.min(magnitude / C_VAL_SOCIAL_CADENCE_EXTREME_PERCENT, 1);
  const easedProgress = 1 - (1 - normalizedMove) ** C_VAL_SOCIAL_CADENCE_EASE_OUT_EXPONENT;
  const logInterval = Math.log(C_VAL_SOCIAL_CADENCE_QUIET_MS)
    + (Math.log(C_VAL_SOCIAL_CADENCE_EXTREME_MS) - Math.log(C_VAL_SOCIAL_CADENCE_QUIET_MS))
      * easedProgress;
  return Math.round(Math.exp(logInterval));
}

