import type { CValSnapshot } from "@/components/c-val/2/model";
import { clamp, cValPriceChange } from "../social-presenter";

export const C_VAL_PEOPLE_COLUMNS = 40;
export const C_VAL_PEOPLE_ROWS = 40;
export const C_VAL_PEOPLE_COUNT = C_VAL_PEOPLE_COLUMNS * C_VAL_PEOPLE_ROWS;
export const C_VAL_PEOPLE_FULL_CHANGE = 12;

export type CValPeopleState = {
  change: number;
  smilingCount: number;
  cryingCount: number;
};

export function cValPeopleFromChange(change: number): CValPeopleState {
  const safeChange = Number.isFinite(change) ? change : 0;
  const smilingShare = clamp(0.5 + safeChange / (C_VAL_PEOPLE_FULL_CHANGE * 2), 0, 1);
  const smilingCount = Math.round(smilingShare * C_VAL_PEOPLE_COUNT);
  return {
    change: safeChange,
    smilingCount,
    cryingCount: C_VAL_PEOPLE_COUNT - smilingCount,
  };
}

export function presentCValPeople(snapshot: CValSnapshot) {
  return cValPeopleFromChange(cValPriceChange(snapshot));
}
