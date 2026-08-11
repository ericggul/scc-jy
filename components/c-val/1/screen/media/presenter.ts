import type { CValSnapshot } from "@/components/c-val/1/model";
import { cValPriceChange } from "../social-presenter";
import {
  C_VAL_MEDIA_CELLS_PER_PERCENT,
  C_VAL_MEDIA_MAX_CELLS,
} from "./config";

export {
  C_VAL_MEDIA_CELLS_PER_PERCENT,
  C_VAL_MEDIA_MAX_CELLS,
} from "./config";

export type CValMediaLayout = {
  direction: "gain" | "loss" | "quiet";
  activeCount: number;
  dimension: number;
};

export function cValMediaLayoutFromChange(change: number): CValMediaLayout {
  const safeChange = Number.isFinite(change) ? change : 0;
  const activeCount = Math.min(
    C_VAL_MEDIA_MAX_CELLS,
    safeChange === 0
      ? 0
      : Math.max(
          1,
          Math.ceil(Math.abs(safeChange) * C_VAL_MEDIA_CELLS_PER_PERCENT),
        ),
  );
  return {
    direction: safeChange > 0 ? "gain" : safeChange < 0 ? "loss" : "quiet",
    activeCount,
    dimension: Math.max(1, Math.ceil(Math.sqrt(activeCount))),
  };
}

export function presentCValMedia(snapshot: CValSnapshot) {
  return cValMediaLayoutFromChange(cValPriceChange(snapshot));
}

export function cValMediaCellOrder(dimension: number) {
  const size = Math.max(1, Math.floor(dimension));
  return Array.from({ length: size * size }, (_, index) => ({
    column: index % size,
    row: Math.floor(index / size),
  }));
}
