export const monochromeColours = [
  "#e53935", "#fb8c00", "#fdd835", "#43a047", "#00a99d",
  "#1e88e5", "#3949ab", "#8e24aa", "#d81b60", "#6d4c41",
] as const;

export const fieldConfig = {
  phoneCount: 90,
  minimumRows: 5,
  phoneWidth: 390,
  phoneHeight: 844,
  gapRatio: 0.035,
  outerMarginRatio: 0.025,
  tickMs: 250,
  presenceProbability: 0.5,
  cadenceJitter: 0.25,
  cadenceMs: [6000, 8300, 7100, 11000, 9400, 6700],
} as const;

export type FieldSettings = {
  phoneCount: number;
  minimumRows: number;
  gapRatio: number;
  presenceProbability: number;
  phoneScale: number;
  speed: number;
};

export const defaultSettings: FieldSettings = {
  phoneCount: fieldConfig.phoneCount,
  minimumRows: fieldConfig.minimumRows,
  gapRatio: fieldConfig.gapRatio,
  presenceProbability: fieldConfig.presenceProbability,
  phoneScale: 1,
  speed: 2.5,
};
