const baselineInteractionsToFullAccumulation = 24;

// The interactive version now accumulates one quarter of its preceding trial.
// Keep these quantities together so the next volume trial stays local.
export const interactiveAccumulationScale = 0.125;
export const interactiveFallingParticleScale = 0.5;
export const interactiveTraceParticleScale = 0.14;
export const interactionsToFullAccumulation = Math.ceil(
  baselineInteractionsToFullAccumulation / interactiveAccumulationScale,
);

export function particlesPerInteractiveDrop(count: number) {
  return Math.max(1, Math.round(count * interactiveFallingParticleScale));
}

export function particlesPerInteractiveTrace(count: number) {
  return Math.max(
    24,
    Math.round(
      particlesPerInteractiveDrop(count) * interactiveTraceParticleScale,
    ),
  );
}

export function accumulationProgressFromInteractions(count: number) {
  return Math.min(
    1,
    Math.max(0, count / interactionsToFullAccumulation),
  );
}
