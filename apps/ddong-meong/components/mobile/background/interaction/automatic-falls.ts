import type { AccumulationProfile } from "../profiles";

function hash11(value: number) {
  const result = Math.sin(value * 127.1) * 43758.5453123;
  return result - Math.floor(result);
}

function rangeValue(
  [minimum, maximum]: readonly [number, number],
  seed: number,
) {
  return minimum + (maximum - minimum) * hash11(seed);
}

/**
 * Each entry marks the moment an emitted automatic stream reaches the reservoir.
 * The visual rhythm uses the same phrase seeds as the background shader.
 */
export function automaticFallSettlementTimesMs(
  profile: AccumulationProfile,
  totalMs: number,
) {
  const settlementTimes: number[] = [];
  const { emission, fall } = profile;
  const phraseCount = Math.ceil(totalMs / (emission.phraseDuration * 1000));
  const travelMs = fall.backgroundDuration * 1000;

  function addIfSettlesBeforeEnd(emittedAtMs: number) {
    const settlesAtMs = emittedAtMs + travelMs;
    if (settlesAtMs <= totalMs) settlementTimes.push(settlesAtMs);
  }

  for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
    const phraseStartMs = phraseIndex * emission.phraseDuration * 1000;
    const firstDuration = rangeValue(
      emission.firstDuration,
      phraseIndex * 4.13 + 1.7 + emission.rhythmSeed,
    );
    const firstPause = rangeValue(
      emission.firstPause,
      phraseIndex * 5.71 + 3.2 + emission.rhythmSeed,
    );
    const secondStart = firstDuration + firstPause;
    const secondDuration = rangeValue(
      emission.secondDuration,
      phraseIndex * 7.31 + 5.8 + emission.rhythmSeed,
    );
    const secondPause = rangeValue(
      emission.secondPause,
      phraseIndex * 8.93 + 2.4 + emission.rhythmSeed,
    );
    const thirdStart = secondStart + secondDuration + secondPause;
    const hasThirdStream =
      hash11(phraseIndex * 6.17 + 9.1 + emission.rhythmSeed) >=
      1 - emission.thirdProbability;

    addIfSettlesBeforeEnd(phraseStartMs);
    addIfSettlesBeforeEnd(phraseStartMs + secondStart * 1000);
    if (hasThirdStream) addIfSettlesBeforeEnd(phraseStartMs + thirdStart * 1000);
  }

  return settlementTimes;
}

export function countSettledAutomaticFalls(
  settlementTimesMs: readonly number[],
  elapsedMs: number,
) {
  let count = 0;
  for (const settlesAtMs of settlementTimesMs) {
    if (settlesAtMs > elapsedMs) break;
    count += 1;
  }
  return count;
}
