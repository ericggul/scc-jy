import type { CValSnapshot } from "@/components/c-val/2/model";

export const cValSocialRegimes = [
  "crash",
  "down",
  "flat",
  "up",
  "surge",
] as const;

export type CValSocialRegime = (typeof cValSocialRegimes)[number];

export function finite(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function cValPriceChange(snapshot: CValSnapshot) {
  if (snapshot.phase === "waiting") return 0;
  return finite(snapshot.market.changeFromOpenPercent);
}

export function cValSocialRegimeFor(change: number): CValSocialRegime {
  const safeChange = finite(change);
  if (safeChange <= -3) return "crash";
  if (safeChange < -0.25) return "down";
  if (safeChange >= 3) return "surge";
  if (safeChange > 0.25) return "up";
  return "flat";
}

export function cValSocialIntensity(snapshot: CValSnapshot) {
  const dailyMove = Math.abs(cValPriceChange(snapshot));
  const immediateMove = Math.abs(finite(snapshot.market.oneSecondMovePercent));
  const volatility = finite(snapshot.market.realizedVolatilityBps) / 250;
  return clamp(Math.max(dailyMove / 8, immediateMove / 3, volatility), 0, 1);
}

export function cValStableHash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}
