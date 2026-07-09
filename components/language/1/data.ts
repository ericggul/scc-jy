export const languageSlots = [
  "Arabic",
  "French",
  "Spanish",
  "Japanese",
  "English",
  "Korean",
  "Chinese",
  "German",
  "Hindi",
  "Vietnamese",
  "Russian",
] as const;

export const politicalSlots = [
  "far-left",
  "left",
  "center-left",
  "liberal",
  "moderate-left",
  "neutral-original",
  "moderate-right",
  "conservative",
  "center-right",
  "right",
  "far-right",
] as const;

export const centerSlotIndex = 5;
export const slotCount = 11;

export type LanguageSlot = (typeof languageSlots)[number];
export type PoliticalSlot = (typeof politicalSlots)[number];

export type NormalizedCoordinate = {
  x: number;
  y: number;
};

export type QuantizedTransformTarget = {
  coordinate: NormalizedCoordinate;
  languageIndex: number;
  politicalIndex: number;
  language: LanguageSlot;
  political: PoliticalSlot;
};

export type TransformRequest = {
  text: string;
  language: LanguageSlot;
  political: PoliticalSlot;
};

export type TransformUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

export type TransformResponse = {
  text: string;
  model: string | null;
  usage: TransformUsage | null;
  cached: boolean;
};
