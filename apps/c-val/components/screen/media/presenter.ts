import type { CValSnapshot } from "@/components/model";
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

/** The media field alone becomes the entry point two minutes after inactivity. */
export const C_VAL_MEDIA_ENTRY_AFTER_INACTIVE_MS = 120_000;

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

export function cValMediaShouldShowEntry(
  snapshot: CValSnapshot,
  now = Date.now(),
) {
  if (snapshot.phase === "waiting") return true;
  if (snapshot.phase !== "closing-auction") return false;
  const inactiveAt = snapshot.idle?.inactiveAt;
  return (
    Number.isFinite(inactiveAt) &&
    now - (inactiveAt as number) >= C_VAL_MEDIA_ENTRY_AFTER_INACTIVE_MS
  );
}

export function cValMediaCellOrder(dimension: number) {
  const size = Math.max(1, Math.floor(dimension));
  return Array.from({ length: size * size }, (_, index) => ({
    column: index % size,
    row: Math.floor(index / size),
  }));
}
