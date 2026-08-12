import type { CycleSnapshot } from "@/components/network-system/cycle/model";

export const EMPLOYMENT_FAMILY_COLUMNS = 8;
export const EMPLOYMENT_FAMILY_ROWS = 14;
export const EMPLOYMENT_FAMILY_COUNT =
  EMPLOYMENT_FAMILY_COLUMNS * EMPLOYMENT_FAMILY_ROWS;

export const EMPLOYMENT_NORMAL_BASELINE = 0.03;
export const EMPLOYMENT_FULL_DISTRESS_LEVEL = -0.55;

export type CycleEmploymentFamilyState = {
  currentEmployment: number;
  shortfall: number;
  distressedShare: number;
  distressedCount: number;
};

function finite(value: number | undefined) {
  return Number.isFinite(value) ? (value as number) : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function presentCycleEmploymentFamilies(
  snapshot: CycleSnapshot,
): CycleEmploymentFamilyState {
  const currentEmployment = finite(snapshot.values.employment);
  const shortfall = Math.max(
    0,
    EMPLOYMENT_NORMAL_BASELINE - currentEmployment,
  );
  const fullDistressShortfall =
    EMPLOYMENT_NORMAL_BASELINE - EMPLOYMENT_FULL_DISTRESS_LEVEL;
  const distressedShare = clamp(shortfall / fullDistressShortfall, 0, 1);
  const scaledDistressedCount = distressedShare * EMPLOYMENT_FAMILY_COUNT;

  return {
    currentEmployment,
    shortfall,
    distressedShare,
    distressedCount:
      shortfall === 0
        ? 0
        : Math.max(1, Math.ceil(scaledDistressedCount - 1e-9)),
  };
}
