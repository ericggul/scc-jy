import type { CycleSnapshot } from "@/components/network-system/cycle/model";

export const EMPLOYMENT_EMOJI_COLUMNS = 40;
export const EMPLOYMENT_EMOJI_ROWS = 40;
export const EMPLOYMENT_EMOJI_COUNT =
  EMPLOYMENT_EMOJI_COLUMNS * EMPLOYMENT_EMOJI_ROWS;
export const EMPLOYMENT_EMOJI_EXTREME = 2;

export type CycleEmploymentEmojiState = {
  currentEmployment: number;
  distressedCount: number;
};

export function presentCycleEmploymentEmojis(
  snapshot: CycleSnapshot,
): CycleEmploymentEmojiState {
  const currentEmployment = Number.isFinite(snapshot.values.employment)
    ? snapshot.values.employment
    : 0;
  const distressedShare = Math.min(
    Math.max(
      0.5 - currentEmployment / (EMPLOYMENT_EMOJI_EXTREME * 2),
      0,
    ),
    1,
  );
  const scaledCount = distressedShare * EMPLOYMENT_EMOJI_COUNT;

  return {
    currentEmployment,
    distressedCount: Math.min(
      EMPLOYMENT_EMOJI_COUNT,
      Math.max(0, Math.round(scaledCount)),
    ),
  };
}
