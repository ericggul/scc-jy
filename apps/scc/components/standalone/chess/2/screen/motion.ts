export const MOTION_TIMELINE = {
  travelStart: 0.1,
  travelEnd: 0.9,
} as const;

export const RELATION_ARCHIVE_OPACITY = 0.5;

export function motionTiming(duration: number) {
  const fadeIn = duration * MOTION_TIMELINE.travelStart;
  const travel = duration * (MOTION_TIMELINE.travelEnd - MOTION_TIMELINE.travelStart);
  const fadeOut = duration - fadeIn - travel;
  return { fadeIn, travel, fadeOut, fadeOutDelay: fadeIn + travel };
}
