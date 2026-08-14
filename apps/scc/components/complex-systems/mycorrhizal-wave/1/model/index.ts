export const PLATE_WIDTH = 1_920;
export const PLATE_HEIGHT = 916;
export const MAX_OBSERVED_HOUR = 138;
export const OBSERVED_HOURS_PER_VIDEO_SECOND = 5;

export type PlateNodeRole = 0 | 1;
export type PlateNode = readonly [x: number, y: number, role: PlateNodeRole];
export type AnastomosisEvent = readonly [hour: number, x: number, y: number];

export type Plate94Timeline = {
  readonly frames: readonly (readonly PlateNode[])[];
  readonly anastomoses: readonly AnastomosisEvent[];
};

export function clampObservedHour(hour: number) {
  return Math.min(MAX_OBSERVED_HOUR, Math.max(0, Math.round(hour)));
}

export function hourToVideoTime(hour: number) {
  return clampObservedHour(hour) / OBSERVED_HOURS_PER_VIDEO_SECOND;
}

export function videoTimeToHour(seconds: number) {
  return clampObservedHour(seconds * OBSERVED_HOURS_PER_VIDEO_SECOND);
}

export function nodesAtHour(timeline: Plate94Timeline, hour: number) {
  return timeline.frames[clampObservedHour(hour)] ?? [];
}

export function anastomosesAtHour(timeline: Plate94Timeline, hour: number) {
  const observedHour = clampObservedHour(hour);
  return timeline.anastomoses.filter(([eventHour]) => eventHour <= observedHour);
}
