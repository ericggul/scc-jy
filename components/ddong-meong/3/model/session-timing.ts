export type PausableSessionTiming = {
  pausedAt: number | null;
  pausedDurationMs: number;
  startedAt: number;
};

export function getPausableElapsedMs(
  { pausedAt, pausedDurationMs, startedAt }: PausableSessionTiming,
  now = Date.now(),
) {
  const activeNow = pausedAt ?? now;
  return Math.max(0, activeNow - startedAt - pausedDurationMs);
}
