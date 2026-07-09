import {
  centerSlotIndex,
  languageSlots,
  politicalSlots,
  slotCount,
  type NormalizedCoordinate,
  type QuantizedTransformTarget,
} from "./data";

export function clampUnit(value: number) {
  return Math.max(-1, Math.min(1, value));
}

export function quantizeAxis(value: number) {
  const normalized = (clampUnit(value) + 1) / 2;
  return Math.max(0, Math.min(slotCount - 1, Math.round(normalized * (slotCount - 1))));
}

export function slotCenter(index: number) {
  if (slotCount <= 1) {
    return 0;
  }

  return (index / (slotCount - 1)) * 2 - 1;
}

export function quantizeCoordinate(
  coordinate: NormalizedCoordinate,
): QuantizedTransformTarget {
  const languageIndex = quantizeAxis(coordinate.y);
  const politicalIndex = quantizeAxis(coordinate.x);

  return {
    coordinate: {
      x: clampUnit(coordinate.x),
      y: clampUnit(coordinate.y),
    },
    languageIndex,
    politicalIndex,
    language: languageSlots[languageIndex],
    political: politicalSlots[politicalIndex],
  };
}

export function isOriginalTarget(target: QuantizedTransformTarget) {
  return (
    target.languageIndex === centerSlotIndex &&
    target.politicalIndex === centerSlotIndex
  );
}
