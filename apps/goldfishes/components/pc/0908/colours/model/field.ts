import {
  defaultSettings,
  fieldConfig,
  monochromeColours,
  type FieldSettings,
} from "./config";

export type FishPhone = {
  id: string;
  colourIndex: number;
  activeColour: string | null;
  cadenceMs: number;
  nextUpdateAt: number;
};

export function createField(count: number = fieldConfig.phoneCount): FishPhone[] {
  return Array.from({ length: Math.max(0, Math.min(192, Math.floor(count))) }, (_, index) => ({
    id: `goldfish-${String(index + 1).padStart(3, "0")}`,
    colourIndex: index % monochromeColours.length,
    activeColour: monochromeColours[index % monochromeColours.length],
    cadenceMs: fieldConfig.cadenceMs[index % fieldConfig.cadenceMs.length],
    nextUpdateAt: 0,
  }));
}

export function advanceField(
  phones: FishPhone[],
  elapsed: number,
  samples: readonly { presence: number; dwell: number; phase: number }[],
  settings: FieldSettings = defaultSettings,
): FishPhone[] {
  let changed = false;
  const next = phones.map((phone, index) => {
    if (elapsed < phone.nextUpdateAt) return phone;
    changed = true;
    const sample = samples[index]!;
    const colourIndex = (phone.colourIndex + 1) % monochromeColours.length;
    const activeColour = sample.presence < settings.presenceProbability
      ? monochromeColours[colourIndex]
      : null;
    const duration = phone.cadenceMs * (1 + (sample.dwell * 2 - 1) * fieldConfig.cadenceJitter) / settings.speed;
    const remaining = phone.nextUpdateAt === 0 ? 1 - sample.phase : 1;
    return { ...phone, colourIndex, activeColour, nextUpdateAt: elapsed + duration * remaining };
  });
  return changed ? next : phones;
}
