import {
  createLivingVoronoiState,
  createVoronoiDiagram,
  resizeLivingVoronoiState,
  stepLivingVoronoi,
  type LivingVoronoiState,
  type VoronoiDiagram,
  type VoronoiSeed,
} from "./model";

export type PortraitFieldState = {
  voronoi: LivingVoronoiState;
  portraitBySeedId: Record<number, string>;
};

function assignPortraits(
  seeds: readonly VoronoiSeed[],
  portraitIds: readonly string[],
  previous: Record<number, string> = {},
) {
  const liveSeedIds = new Set(seeds.map((seed) => seed.id));
  const next = Object.fromEntries(
    Object.entries(previous).filter(([seedId]) => liveSeedIds.has(Number(seedId))),
  ) as Record<number, string>;
  const usedPortraits = new Set(Object.values(next));
  let fallbackIndex = 0;

  for (const seed of seeds) {
    if (next[seed.id]) continue;
    const unusedPortrait = portraitIds.find(
      (portraitId) => !usedPortraits.has(portraitId),
    );
    const portraitId =
      unusedPortrait ?? portraitIds[fallbackIndex % portraitIds.length]!;
    next[seed.id] = portraitId;
    usedPortraits.add(portraitId);
    fallbackIndex += 1;
  }

  return next;
}

export function createPortraitFieldState(
  width: number,
  height: number,
  portraitIds: readonly string[],
): PortraitFieldState {
  const voronoi = createLivingVoronoiState(width, height);

  return {
    voronoi,
    portraitBySeedId: assignPortraits(voronoi.seeds, portraitIds),
  };
}

export function resizePortraitFieldState(
  state: PortraitFieldState,
  width: number,
  height: number,
): PortraitFieldState {
  return {
    ...state,
    voronoi: resizeLivingVoronoiState(state.voronoi, width, height),
  };
}

export function stepPortraitField(
  state: PortraitFieldState,
  delta: number,
  portraitIds: readonly string[],
): PortraitFieldState {
  const voronoi = stepLivingVoronoi(state.voronoi, delta);

  return {
    voronoi,
    portraitBySeedId: assignPortraits(
      voronoi.seeds,
      portraitIds,
      state.portraitBySeedId,
    ),
  };
}

export { createVoronoiDiagram };
export type { VoronoiDiagram, VoronoiSeed };
