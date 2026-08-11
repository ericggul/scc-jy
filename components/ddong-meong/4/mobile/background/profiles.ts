export type NumberRange = readonly [minimum: number, maximum: number];
export type RgbColor = readonly [red: number, green: number, blue: number];

export type AccumulationMaterialKind =
  | "filament"
  | "viscous-stream"
  | "solid-form"
  | "heavy-column"
  | "drifting-mist"
  | "liquid-burst";

export type AccumulationProfile = {
  id: string;
  materialKind: AccumulationMaterialKind;
  palette: {
    void: RgbColor;
    deep: RgbColor;
    middle: RgbColor;
    surface: RgbColor;
    highlight: RgbColor;
  };
  particles: {
    reservoirCount: number;
    filamentCount: number;
    reservoirSeed: number;
    filamentSeed: number;
  };
  boundary: {
    transitionMaximum: number;
    shallowDepthRatio: number;
    broadNoise: number;
    primaryWave: number;
    secondaryWave: number;
    reservoirPrimaryWave: number;
    reservoirSecondaryWave: number;
    reservoirHeightVariation: number;
    highlightLineStrength: number;
    highlightLineWidth: number;
  };
  emission: {
    phraseDuration: number;
    firstDuration: NumberRange;
    firstPause: NumberRange;
    secondDuration: NumberRange;
    secondPause: NumberRange;
    thirdDuration: NumberRange;
    thirdProbability: number;
    pressure: NumberRange;
    pressureFrequency: number;
    rhythmSeed: number;
  };
  fall: {
    duration: NumberRange;
    backgroundDuration: number;
    travelExponent: number;
    spawnHeight: number;
    laneCenter: number;
    laneDrift: number;
    primaryWander: number;
    secondaryWander: number;
    laneWidth: NumberRange;
    backgroundWidth: NumberRange;
    widthPulse: NumberRange;
    microFlow: number;
    turbulence: number;
  };
  accumulation: {
    completionProgress: number;
    riseExponent: number;
    finalHeight: number;
    longSurgeAmplitude: number;
    longSurgeFrequency: number;
    longSurgePhase: number;
    shortSurgeAmplitude: number;
    shortSurgeFrequency: number;
    shortSurgePhase: number;
    flowSpeed: number;
    primaryHorizontalFlow: number;
    secondaryHorizontalFlow: number;
    verticalFlow: number;
  };
  material: {
    reservoirAlpha: NumberRange;
    reservoirPointSize: NumberRange;
    reservoirStretch: NumberRange;
    reservoirSoftness: NumberRange;
    coreAlpha: NumberRange;
    veilAlpha: NumberRange;
    veilThreshold: number;
    corePointSize: NumberRange;
    veilPointSize: NumberRange;
    coreStretch: NumberRange;
    veilStretch: NumberRange;
    coreSoftness: number;
    veilSoftness: number;
    backgroundOpacity: number;
  };
  solid: {
    count: number;
    size: NumberRange;
    aspect: NumberRange;
    horizontalSpread: number;
    curvature: number;
    rotation: number;
    roughness: number;
  };
};

type ProfileOverrides = {
  id?: string;
  materialKind?: AccumulationMaterialKind;
  palette?: Partial<AccumulationProfile["palette"]>;
  particles?: Partial<AccumulationProfile["particles"]>;
  boundary?: Partial<AccumulationProfile["boundary"]>;
  emission?: Partial<AccumulationProfile["emission"]>;
  fall?: Partial<AccumulationProfile["fall"]>;
  accumulation?: Partial<AccumulationProfile["accumulation"]>;
  material?: Partial<AccumulationProfile["material"]>;
  solid?: Partial<AccumulationProfile["solid"]>;
};

const baselineValues: AccumulationProfile = {
  id: "baseline",
  materialKind: "filament",
  palette: {
    void: [0.006, 0.006, 0.006],
    deep: [0.141, 0.074, 0.059],
    middle: [0.337, 0.2, 0.149],
    surface: [0.588, 0.396, 0.294],
    highlight: [0.737, 0.537, 0.408],
  },
  particles: {
    reservoirCount: 6200,
    filamentCount: 2800,
    reservoirSeed: 0x7a31c2,
    filamentSeed: 0xc48f19,
  },
  boundary: {
    transitionMaximum: 0.075,
    shallowDepthRatio: 0.72,
    broadNoise: 0.075,
    primaryWave: 0.011,
    secondaryWave: 0.004,
    reservoirPrimaryWave: 0.014,
    reservoirSecondaryWave: 0.006,
    reservoirHeightVariation: 0.095,
    highlightLineStrength: 0,
    highlightLineWidth: 0.018,
  },
  emission: {
    phraseDuration: 12,
    firstDuration: [2.8, 5],
    firstPause: [1.6, 3],
    secondDuration: [1.4, 3],
    secondPause: [1.2, 2.4],
    thirdDuration: [0.8, 1.8],
    thirdProbability: 0.25,
    pressure: [0.76, 1],
    pressureFrequency: 0.82,
    rhythmSeed: 0,
  },
  fall: {
    duration: [1.8, 2.7],
    backgroundDuration: 2.25,
    travelExponent: 1.16,
    spawnHeight: 1.12,
    laneCenter: 0.5,
    laneDrift: 0.045,
    primaryWander: 0.019,
    secondaryWander: 0.007,
    laneWidth: [0.011, 0.037],
    backgroundWidth: [0.003, 0.047],
    widthPulse: [0.82, 1.16],
    microFlow: 0.0035,
    turbulence: 0.016,
  },
  accumulation: {
    completionProgress: 0.985,
    riseExponent: 0.86,
    finalHeight: 1.14,
    longSurgeAmplitude: 0.022,
    longSurgeFrequency: 19,
    longSurgePhase: -1.1,
    shortSurgeAmplitude: 0.009,
    shortSurgeFrequency: 47,
    shortSurgePhase: 0.8,
    flowSpeed: 1,
    primaryHorizontalFlow: 0.014,
    secondaryHorizontalFlow: 0.006,
    verticalFlow: 0.008,
  },
  material: {
    reservoirAlpha: [0.08, 0.34],
    reservoirPointSize: [1, 3.3],
    reservoirStretch: [1, 1.6],
    reservoirSoftness: [0.18, 0.34],
    coreAlpha: [0.34, 0.82],
    veilAlpha: [0.07, 0.18],
    veilThreshold: 0.7,
    corePointSize: [1.4, 3.8],
    veilPointSize: [10, 24],
    coreStretch: [1.6, 3],
    veilStretch: [3.2, 5.5],
    coreSoftness: 0.14,
    veilSoftness: 0.38,
    backgroundOpacity: 0.29,
  },
  solid: {
    count: 0,
    size: [0.12, 0.18],
    aspect: [0.34, 0.5],
    horizontalSpread: 0.18,
    curvature: 0.12,
    rotation: 0.24,
    roughness: 0.08,
  },
};

function isFiniteRange(range: NumberRange) {
  return (
    Number.isFinite(range[0]) &&
    Number.isFinite(range[1]) &&
    range[0] <= range[1]
  );
}

function isRangeWithin(range: NumberRange, minimum: number, maximum: number) {
  return (
    isFiniteRange(range) && range[0] >= minimum && range[1] <= maximum
  );
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function assertProfile(profile: AccumulationProfile) {
  const ranges = [
    profile.emission.firstDuration,
    profile.emission.firstPause,
    profile.emission.secondDuration,
    profile.emission.secondPause,
    profile.emission.thirdDuration,
    profile.emission.pressure,
    profile.fall.duration,
    profile.fall.laneWidth,
    profile.fall.backgroundWidth,
    profile.fall.widthPulse,
    profile.material.reservoirAlpha,
    profile.material.reservoirPointSize,
    profile.material.reservoirStretch,
    profile.material.reservoirSoftness,
    profile.material.coreAlpha,
    profile.material.veilAlpha,
    profile.material.corePointSize,
    profile.material.veilPointSize,
    profile.material.coreStretch,
    profile.material.veilStretch,
    profile.solid.size,
    profile.solid.aspect,
  ];

  if (ranges.some((range) => !isFiniteRange(range))) {
    throw new Error(`Invalid accumulation range in profile: ${profile.id}`);
  }
  const colors = Object.values(profile.palette).flat();
  const alphaRanges = [
    profile.material.reservoirAlpha,
    profile.material.coreAlpha,
    profile.material.veilAlpha,
  ];
  const positiveScalars = [
    profile.boundary.transitionMaximum,
    profile.boundary.shallowDepthRatio,
    profile.boundary.highlightLineWidth,
    profile.emission.phraseDuration,
    profile.emission.pressureFrequency,
    profile.fall.backgroundDuration,
    profile.fall.travelExponent,
    profile.fall.spawnHeight,
    profile.accumulation.riseExponent,
    profile.accumulation.finalHeight,
    profile.accumulation.flowSpeed,
    profile.material.coreSoftness,
    profile.material.veilSoftness,
  ];

  if (
    colors.some((channel) => channel < 0 || channel > 1) ||
    ranges.some((range) => range[0] <= 0) ||
    alphaRanges.some((range) => !isRangeWithin(range, 0, 1)) ||
    positiveScalars.some((value) => !Number.isFinite(value) || value <= 0) ||
    profile.material.coreSoftness >= 0.5 ||
    profile.material.veilSoftness >= 0.5 ||
    profile.material.reservoirSoftness[1] >= 0.5 ||
    profile.boundary.highlightLineStrength < 0 ||
    profile.boundary.highlightLineStrength > 1 ||
    profile.fall.laneCenter < 0 ||
    profile.fall.laneCenter > 1
  ) {
    throw new Error(`Invalid accumulation value in profile: ${profile.id}`);
  }
  if (
    profile.emission.thirdProbability < 0 ||
    profile.emission.thirdProbability > 1 ||
    profile.accumulation.completionProgress <= 0 ||
    profile.accumulation.completionProgress > 1 ||
    profile.accumulation.finalHeight < 1
  ) {
    throw new Error(`Invalid accumulation invariant in profile: ${profile.id}`);
  }
  if (
    !Number.isInteger(profile.particles.reservoirCount) ||
    !Number.isInteger(profile.particles.filamentCount) ||
    profile.particles.reservoirCount <= 0 ||
    profile.particles.filamentCount <= 0
  ) {
    throw new Error(`Invalid particle count in profile: ${profile.id}`);
  }
  if (
    !Number.isInteger(profile.solid.count) ||
    profile.solid.count < 0 ||
    (profile.materialKind === "solid-form" && profile.solid.count === 0)
  ) {
    throw new Error(`Invalid solid form count in profile: ${profile.id}`);
  }
}

export function defineAccumulationProfile(
  overrides: ProfileOverrides = {},
): AccumulationProfile {
  const profile: AccumulationProfile = {
    ...baselineValues,
    ...overrides,
    palette: { ...baselineValues.palette, ...overrides.palette },
    particles: { ...baselineValues.particles, ...overrides.particles },
    boundary: { ...baselineValues.boundary, ...overrides.boundary },
    emission: { ...baselineValues.emission, ...overrides.emission },
    fall: { ...baselineValues.fall, ...overrides.fall },
    accumulation: {
      ...baselineValues.accumulation,
      ...overrides.accumulation,
    },
    material: { ...baselineValues.material, ...overrides.material },
    solid: { ...baselineValues.solid, ...overrides.solid },
  };

  assertProfile(profile);
  return deepFreeze(profile);
}

export const baselineAccumulationProfile = defineAccumulationProfile();

const morningUrgentProfile = defineAccumulationProfile({
  id: "morning-urgent",
  materialKind: "viscous-stream",
  palette: {
    deep: [0.11, 0.052, 0.024],
    middle: [0.34, 0.16, 0.055],
    surface: [0.66, 0.39, 0.14],
    highlight: [0.84, 0.61, 0.28],
  },
  particles: {
    reservoirCount: 6400,
    filamentCount: 3000,
    reservoirSeed: 0x1ea71a,
    filamentSeed: 0x10a5e5,
  },
  boundary: {
    transitionMaximum: 0.09,
    broadNoise: 0.065,
    primaryWave: 0.008,
    secondaryWave: 0.003,
    reservoirPrimaryWave: 0.011,
    reservoirSecondaryWave: 0.004,
    reservoirHeightVariation: 0.075,
  },
  emission: {
    phraseDuration: 11,
    firstDuration: [3.6, 5.1],
    firstPause: [1.1, 2],
    secondDuration: [2.1, 3.6],
    secondPause: [1.2, 2.3],
    thirdDuration: [0.9, 1.5],
    thirdProbability: 0.32,
    pressure: [0.82, 1],
    pressureFrequency: 0.86,
    rhythmSeed: 71.3,
  },
  fall: {
    duration: [1.45, 2.15],
    backgroundDuration: 1.75,
    travelExponent: 1.3,
    laneDrift: 0.041,
    primaryWander: 0.014,
    secondaryWander: 0.005,
    laneWidth: [0.018, 0.056],
    backgroundWidth: [0.005, 0.068],
    widthPulse: [0.88, 1.1],
    microFlow: 0.0025,
    turbulence: 0.012,
  },
  accumulation: {
    riseExponent: 0.78,
    longSurgeAmplitude: 0.022,
    shortSurgeAmplitude: 0.009,
    flowSpeed: 0.93,
    primaryHorizontalFlow: 0.012,
    secondaryHorizontalFlow: 0.005,
    verticalFlow: 0.006,
  },
  material: {
    reservoirAlpha: [0.07, 0.31],
    reservoirPointSize: [1.2, 3.8],
    coreAlpha: [0.3, 0.74],
    veilAlpha: [0.08, 0.2],
    veilThreshold: 0.64,
    corePointSize: [1.8, 4.8],
    veilPointSize: [13, 29],
    coreStretch: [2, 3.8],
    veilStretch: [4, 6.8],
    coreSoftness: 0.17,
    veilSoftness: 0.42,
    backgroundOpacity: 0.25,
  },
});

const thickPoopImaginationProfile = defineAccumulationProfile({
  id: "thick-poop-imagination",
  materialKind: "solid-form",
  palette: {
    deep: [0.085, 0.064, 0.026],
    middle: [0.29, 0.21, 0.055],
    surface: [0.48, 0.34, 0.12],
    highlight: [0.66, 0.49, 0.2],
  },
  particles: {
    reservoirCount: 5900,
    filamentCount: 1900,
    reservoirSeed: 0x7a1710,
    filamentSeed: 0xb0d1a5,
  },
  boundary: {
    transitionMaximum: 0.055,
    broadNoise: 0.045,
    primaryWave: 0.005,
    secondaryWave: 0.002,
    reservoirPrimaryWave: 0.007,
    reservoirSecondaryWave: 0.003,
    reservoirHeightVariation: 0.055,
  },
  emission: {
    phraseDuration: 16,
    firstDuration: [1.1, 1.8],
    firstPause: [4.8, 6.2],
    secondDuration: [0.9, 1.4],
    secondPause: [3.9, 5.5],
    thirdDuration: [0.7, 1.1],
    thirdProbability: 0.12,
    pressure: [0.78, 0.96],
    pressureFrequency: 0.44,
    rhythmSeed: 83.7,
  },
  fall: {
    duration: [1.3, 2],
    backgroundDuration: 1.65,
    travelExponent: 1.35,
    laneCenter: 0.48,
    laneDrift: 0.016,
    primaryWander: 0.008,
    secondaryWander: 0.003,
    laneWidth: [0.025, 0.075],
    backgroundWidth: [0.005, 0.06],
    widthPulse: [0.72, 1.24],
    microFlow: 0.0015,
    turbulence: 0.007,
  },
  accumulation: {
    riseExponent: 1.02,
    longSurgeAmplitude: 0.01,
    shortSurgeAmplitude: 0.003,
    flowSpeed: 0.42,
    primaryHorizontalFlow: 0.005,
    secondaryHorizontalFlow: 0.002,
    verticalFlow: 0.003,
  },
  material: {
    reservoirAlpha: [0.1, 0.38],
    reservoirPointSize: [1.4, 4.1],
    reservoirStretch: [0.96, 1.22],
    reservoirSoftness: [0.14, 0.26],
    coreAlpha: [0.5, 0.9],
    veilAlpha: [0.05, 0.11],
    veilThreshold: 0.84,
    corePointSize: [3.4, 7.2],
    veilPointSize: [5, 10],
    coreStretch: [0.95, 1.18],
    veilStretch: [1.1, 1.6],
    coreSoftness: 0.12,
    veilSoftness: 0.24,
    backgroundOpacity: 0.22,
  },
  solid: {
    count: 6,
    size: [0.1, 0.16],
    aspect: [0.38, 0.56],
    horizontalSpread: 0.18,
    curvature: 0.16,
    rotation: 0.3,
    roughness: 0.11,
  },
});

const emergencyChillProfile = defineAccumulationProfile({
  id: "emergency-chill",
  materialKind: "heavy-column",
  palette: {
    deep: [0.13, 0.03, 0.019],
    middle: [0.43, 0.11, 0.052],
    surface: [0.71, 0.25, 0.11],
    highlight: [0.86, 0.43, 0.18],
  },
  particles: {
    reservoirCount: 6200,
    filamentCount: 3500,
    reservoirSeed: 0xd07711,
    filamentSeed: 0xb7ea7e,
  },
  boundary: {
    transitionMaximum: 0.07,
    broadNoise: 0.05,
    primaryWave: 0.006,
    secondaryWave: 0.002,
    reservoirPrimaryWave: 0.009,
    reservoirSecondaryWave: 0.003,
    reservoirHeightVariation: 0.068,
  },
  emission: {
    phraseDuration: 10,
    firstDuration: [4.4, 6.1],
    firstPause: [0.8, 1.5],
    secondDuration: [2.6, 4.2],
    secondPause: [0.8, 1.6],
    thirdDuration: [0.8, 1.4],
    thirdProbability: 0.22,
    pressure: [0.94, 1],
    pressureFrequency: 0.84,
    rhythmSeed: 97.2,
  },
  fall: {
    duration: [0.95, 1.55],
    backgroundDuration: 1.25,
    travelExponent: 1.38,
    laneCenter: 0.52,
    laneDrift: 0.018,
    primaryWander: 0.009,
    secondaryWander: 0.003,
    laneWidth: [0.046, 0.13],
    backgroundWidth: [0.018, 0.145],
    widthPulse: [0.94, 1.06],
    microFlow: 0.001,
    turbulence: 0.005,
  },
  accumulation: {
    riseExponent: 0.72,
    longSurgeAmplitude: 0.027,
    longSurgeFrequency: 22,
    shortSurgeAmplitude: 0.011,
    flowSpeed: 1.08,
    primaryHorizontalFlow: 0.008,
    secondaryHorizontalFlow: 0.003,
    verticalFlow: 0.012,
  },
  material: {
    reservoirAlpha: [0.1, 0.38],
    coreAlpha: [0.48, 0.92],
    veilAlpha: [0.09, 0.2],
    veilThreshold: 0.72,
    corePointSize: [2.2, 5.6],
    veilPointSize: [11, 25],
    coreStretch: [1.5, 2.5],
    veilStretch: [2.8, 4.6],
    coreSoftness: 0.12,
    veilSoftness: 0.3,
    backgroundOpacity: 0.38,
  },
});

const constipationDialogueProfile = defineAccumulationProfile({
  id: "constipation-dialogue",
  materialKind: "drifting-mist",
  palette: {
    deep: [0.055, 0.035, 0.024],
    middle: [0.16, 0.085, 0.048],
    surface: [0.31, 0.18, 0.092],
    highlight: [0.44, 0.28, 0.15],
  },
  particles: {
    reservoirCount: 5400,
    filamentCount: 1900,
    reservoirSeed: 0x700a11,
    filamentSeed: 0x500ace,
  },
  boundary: {
    transitionMaximum: 0.095,
    broadNoise: 0.04,
    primaryWave: 0.004,
    secondaryWave: 0.0015,
    reservoirPrimaryWave: 0.005,
    reservoirSecondaryWave: 0.002,
    reservoirHeightVariation: 0.05,
  },
  emission: {
    phraseDuration: 20,
    firstDuration: [1.2, 2.3],
    firstPause: [6.4, 8.2],
    secondDuration: [0.9, 1.7],
    secondPause: [5.6, 7.5],
    thirdDuration: [0.6, 1],
    thirdProbability: 0.04,
    pressure: [0.46, 0.7],
    pressureFrequency: 0.24,
    rhythmSeed: 109.6,
  },
  fall: {
    duration: [3.4, 5.1],
    backgroundDuration: 4.1,
    travelExponent: 1.03,
    laneCenter: 0.47,
    laneDrift: 0.078,
    primaryWander: 0.026,
    secondaryWander: 0.012,
    laneWidth: [0.006, 0.02],
    backgroundWidth: [0.002, 0.03],
    widthPulse: [0.86, 1.12],
    microFlow: 0.004,
    turbulence: 0.022,
  },
  accumulation: {
    riseExponent: 0.96,
    longSurgeAmplitude: 0.008,
    shortSurgeAmplitude: 0.002,
    flowSpeed: 0.3,
    primaryHorizontalFlow: 0.004,
    secondaryHorizontalFlow: 0.0015,
    verticalFlow: 0.002,
  },
  material: {
    reservoirAlpha: [0.14, 0.4],
    reservoirPointSize: [1.2, 3.4],
    coreAlpha: [0.24, 0.6],
    veilAlpha: [0.05, 0.15],
    veilThreshold: 0.6,
    corePointSize: [1, 2.8],
    veilPointSize: [12, 27],
    coreStretch: [1.8, 3.2],
    veilStretch: [3.8, 6.4],
    coreSoftness: 0.18,
    veilSoftness: 0.44,
    backgroundOpacity: 0.17,
  },
});

const celebrityApplauseProfile = defineAccumulationProfile({
  id: "celebrity-applause",
  materialKind: "liquid-burst",
  palette: {
    deep: [0.14, 0.075, 0.022],
    middle: [0.48, 0.29, 0.052],
    surface: [0.77, 0.55, 0.12],
    highlight: [0.94, 0.75, 0.3],
  },
  particles: {
    reservoirCount: 5800,
    filamentCount: 2400,
    reservoirSeed: 0x11a67e,
    filamentSeed: 0xa17f10,
  },
  boundary: {
    transitionMaximum: 0.11,
    broadNoise: 0.09,
    primaryWave: 0.014,
    secondaryWave: 0.006,
    reservoirPrimaryWave: 0.018,
    reservoirSecondaryWave: 0.008,
    reservoirHeightVariation: 0.12,
  },
  emission: {
    phraseDuration: 7.2,
    firstDuration: [0.5, 0.9],
    firstPause: [0.3, 0.55],
    secondDuration: [0.45, 0.8],
    secondPause: [0.25, 0.5],
    thirdDuration: [1.4, 2.6],
    thirdProbability: 0.96,
    pressure: [0.78, 1],
    pressureFrequency: 1.65,
    rhythmSeed: 121.8,
  },
  fall: {
    duration: [1.15, 2.1],
    backgroundDuration: 1.6,
    travelExponent: 1.28,
    laneCenter: 0.53,
    laneDrift: 0.11,
    primaryWander: 0.034,
    secondaryWander: 0.016,
    laneWidth: [0.032, 0.12],
    backgroundWidth: [0.01, 0.115],
    widthPulse: [0.68, 1.36],
    microFlow: 0.011,
    turbulence: 0.025,
  },
  accumulation: {
    riseExponent: 0.78,
    longSurgeAmplitude: 0.028,
    longSurgeFrequency: 15,
    shortSurgeAmplitude: 0.012,
    shortSurgeFrequency: 39,
    flowSpeed: 1.25,
    primaryHorizontalFlow: 0.022,
    secondaryHorizontalFlow: 0.01,
    verticalFlow: 0.013,
  },
  material: {
    reservoirAlpha: [0.07, 0.3],
    reservoirPointSize: [1.1, 3.5],
    coreAlpha: [0.3, 0.72],
    veilAlpha: [0.12, 0.28],
    veilThreshold: 0.52,
    corePointSize: [1.6, 4.2],
    veilPointSize: [18, 38],
    coreStretch: [1.4, 2.6],
    veilStretch: [2.4, 4.5],
    coreSoftness: 0.22,
    veilSoftness: 0.47,
    backgroundOpacity: 0.28,
  },
});

export const guidedAccumulationProfiles = {
  "morning-urgent": morningUrgentProfile,
  "emergency-chill": emergencyChillProfile,
  "celebrity-applause": celebrityApplauseProfile,
  "thick-poop-imagination": thickPoopImaginationProfile,
  "constipation-dialogue": constipationDialogueProfile,
} satisfies Record<GuidedMeditationSlug, AccumulationProfile>;
import type { GuidedMeditationSlug } from "../../model/guided-meditations";
