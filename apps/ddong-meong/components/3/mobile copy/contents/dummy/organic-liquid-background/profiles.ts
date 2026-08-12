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

const lettingGoProfile = defineAccumulationProfile({
  id: "letting-go",
  materialKind: "viscous-stream",
  palette: {
    deep: [0.13, 0.062, 0.03],
    middle: [0.37, 0.19, 0.075],
    surface: [0.62, 0.37, 0.15],
    highlight: [0.75, 0.51, 0.25],
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
    phraseDuration: 14,
    firstDuration: [4.4, 6.6],
    firstPause: [1.6, 2.8],
    secondDuration: [2.8, 4.4],
    secondPause: [1.8, 3.2],
    thirdDuration: [1.2, 2],
    thirdProbability: 0.1,
    pressure: [0.72, 0.94],
    pressureFrequency: 0.58,
    rhythmSeed: 11.3,
  },
  fall: {
    duration: [2.4, 3.4],
    backgroundDuration: 2.9,
    travelExponent: 1.22,
    laneDrift: 0.032,
    primaryWander: 0.014,
    secondaryWander: 0.005,
    laneWidth: [0.014, 0.045],
    backgroundWidth: [0.004, 0.056],
    widthPulse: [0.88, 1.1],
    microFlow: 0.0025,
    turbulence: 0.012,
  },
  accumulation: {
    riseExponent: 0.9,
    longSurgeAmplitude: 0.016,
    shortSurgeAmplitude: 0.006,
    flowSpeed: 0.78,
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

const waitingBodyProfile = defineAccumulationProfile({
  id: "waiting-body",
  materialKind: "solid-form",
  palette: {
    deep: [0.075, 0.063, 0.028],
    middle: [0.22, 0.19, 0.07],
    surface: [0.4, 0.35, 0.14],
    highlight: [0.55, 0.49, 0.23],
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
    phraseDuration: 18,
    firstDuration: [1.5, 2.4],
    firstPause: [6, 8],
    secondDuration: [1, 1.8],
    secondPause: [5, 7],
    thirdDuration: [0.8, 1.2],
    thirdProbability: 0.05,
    pressure: [0.82, 1],
    pressureFrequency: 0.38,
    rhythmSeed: 23.7,
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
    count: 5,
    size: [0.13, 0.2],
    aspect: [0.32, 0.48],
    horizontalSpread: 0.22,
    curvature: 0.16,
    rotation: 0.3,
    roughness: 0.11,
  },
});

const downwardBreathProfile = defineAccumulationProfile({
  id: "downward-breath",
  materialKind: "heavy-column",
  palette: {
    deep: [0.14, 0.028, 0.022],
    middle: [0.39, 0.09, 0.058],
    surface: [0.64, 0.22, 0.13],
    highlight: [0.78, 0.36, 0.21],
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
    phraseDuration: 18,
    firstDuration: [8, 10],
    firstPause: [2, 3],
    secondDuration: [5, 7],
    secondPause: [1.5, 2.5],
    thirdDuration: [0.8, 1.4],
    thirdProbability: 0,
    pressure: [0.9, 1],
    pressureFrequency: 0.32,
    rhythmSeed: 37.2,
  },
  fall: {
    duration: [1.5, 2.2],
    backgroundDuration: 1.85,
    travelExponent: 1.22,
    laneCenter: 0.52,
    laneDrift: 0.018,
    primaryWander: 0.009,
    secondaryWander: 0.003,
    laneWidth: [0.035, 0.1],
    backgroundWidth: [0.012, 0.115],
    widthPulse: [0.94, 1.06],
    microFlow: 0.001,
    turbulence: 0.005,
  },
  accumulation: {
    riseExponent: 0.88,
    longSurgeAmplitude: 0.014,
    longSurgeFrequency: 17,
    shortSurgeAmplitude: 0.004,
    flowSpeed: 0.7,
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

const privateRoomProfile = defineAccumulationProfile({
  id: "private-room",
  materialKind: "drifting-mist",
  palette: {
    deep: [0.026, 0.021, 0.022],
    middle: [0.075, 0.056, 0.057],
    surface: [0.16, 0.118, 0.11],
    highlight: [0.27, 0.205, 0.18],
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
    phraseDuration: 18,
    firstDuration: [2.2, 4],
    firstPause: [5, 7],
    secondDuration: [1.5, 2.8],
    secondPause: [4, 6],
    thirdDuration: [0.8, 1.2],
    thirdProbability: 0,
    pressure: [0.58, 0.82],
    pressureFrequency: 0.31,
    rhythmSeed: 49.6,
  },
  fall: {
    duration: [2.6, 4],
    backgroundDuration: 3.3,
    travelExponent: 1.08,
    laneCenter: 0.47,
    laneDrift: 0.065,
    primaryWander: 0.021,
    secondaryWander: 0.009,
    laneWidth: [0.008, 0.026],
    backgroundWidth: [0.003, 0.04],
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
    reservoirAlpha: [0.05, 0.24],
    reservoirPointSize: [0.9, 2.8],
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

const lighterMomentProfile = defineAccumulationProfile({
  id: "lighter-moment",
  materialKind: "liquid-burst",
  palette: {
    deep: [0.12, 0.075, 0.026],
    middle: [0.39, 0.265, 0.075],
    surface: [0.66, 0.49, 0.16],
    highlight: [0.81, 0.66, 0.29],
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
    phraseDuration: 8.5,
    firstDuration: [0.65, 1.05],
    firstPause: [0.45, 0.8],
    secondDuration: [0.55, 0.95],
    secondPause: [0.35, 0.7],
    thirdDuration: [1.8, 3.2],
    thirdProbability: 0.9,
    pressure: [0.7, 1],
    pressureFrequency: 1.35,
    rhythmSeed: 61.8,
  },
  fall: {
    duration: [1.15, 2.1],
    backgroundDuration: 1.6,
    travelExponent: 1.28,
    laneCenter: 0.53,
    laneDrift: 0.08,
    primaryWander: 0.026,
    secondaryWander: 0.012,
    laneWidth: [0.026, 0.095],
    backgroundWidth: [0.008, 0.09],
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
  "letting-go": lettingGoProfile,
  "waiting-body": waitingBodyProfile,
  "downward-breath": downwardBreathProfile,
  "private-room": privateRoomProfile,
  "lighter-moment": lighterMomentProfile,
} satisfies Record<GuidedMeditationSlug, AccumulationProfile>;
import type { GuidedMeditationSlug } from "@/components/3/model/guided-meditations";
