export const MAX_POPULATION_AGE = 110;

export const populationStateIds = [
  "juvenile",
  "single",
  "partnered",
  "deceased",
];

export const populationEdgeIds = [
  "juvenile-to-single",
  "juvenile-to-deceased",
  "single-to-partnered",
  "single-to-deceased",
  "partnered-to-single",
  "partnered-to-deceased",
  "partnered-to-juvenile",
];

export const defaultPopulationParameters = {
  adulthoodAge: 18,
  juvenileMortalityMultiplier: 1,
  singleMortalityMultiplier: 1,
  partneredMortalityMultiplier: 1,
  unionMultiplier: 1,
  separationMultiplier: 1,
  birthsPerHundredCoupleYears: 8,
};

export const populationParameterRanges = {
  adulthoodAge: [16, 24],
  juvenileMortalityMultiplier: [0.25, 4],
  singleMortalityMultiplier: [0.25, 4],
  partneredMortalityMultiplier: [0.25, 4],
  unionMultiplier: [0, 3],
  separationMultiplier: [0, 3],
  birthsPerHundredCoupleYears: [0, 20],
};

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function emptyCohorts() {
  return Array.from({ length: MAX_POPULATION_AGE + 1 }, () => 0);
}

function addEvenly(cohorts, count, minimumAge, maximumAge) {
  const width = maximumAge - minimumAge + 1;
  for (let index = 0; index < count; index += 1) {
    cohorts[minimumAge + (index % width)] += 1;
  }
}

function createInitialStocks() {
  const juvenile = emptyCohorts();
  const single = emptyCohorts();
  const partnered = emptyCohorts();
  addEvenly(juvenile, 36, 0, 17);
  addEvenly(single, 68, 18, 64);
  addEvenly(partnered, 96, 22, 80);
  return { juvenile, single, partnered, deceased: 0 };
}

function emptyFlows() {
  return Object.fromEntries(populationEdgeIds.map((edgeId) => [edgeId, 0]));
}

let runSequence = 0;

function createRunId(now) {
  runSequence += 1;
  return `${now.toString(36)}-${runSequence.toString(36)}`;
}

export function createPopulationRuntime(now = Date.now(), runId = createRunId(now)) {
  return {
    runId,
    revision: 0,
    serverTime: now,
    year: 0,
    injectionCursor: 0,
    parameters: { ...defaultPopulationParameters },
    stocks: createInitialStocks(),
    edgeFlows: emptyFlows(),
    lastIntervention: null,
  };
}

export function baseMortalityProbability(age) {
  if (age <= 17) return 0.0005;
  if (age <= 39) return 0.001;
  if (age <= 59) return 0.0035;
  if (age <= 69) return 0.01;
  if (age <= 79) return 0.03;
  if (age <= 89) return 0.08;
  return Math.min(0.35, 0.14 + Math.max(age - 90, 0) * 0.02);
}

export function baseUnionProbability(age) {
  if (age <= 24) return 0.04;
  if (age <= 34) return 0.08;
  if (age <= 49) return 0.04;
  if (age <= 64) return 0.015;
  return 0.005;
}

export function baseSeparationProbability(age) {
  if (age <= 34) return 0.025;
  if (age <= 49) return 0.02;
  if (age <= 64) return 0.012;
  return 0.006;
}

export function annualTransitionProbabilities(state, age, parameters) {
  if (state === "deceased") return { stay: 1, death: 0, stateChange: 0 };
  const multiplier = state === "juvenile"
    ? parameters.juvenileMortalityMultiplier
    : state === "single"
      ? parameters.singleMortalityMultiplier
      : parameters.partneredMortalityMultiplier;
  const death = clamp(baseMortalityProbability(age) * multiplier, 0, 1);

  if (state === "juvenile" && age >= parameters.adulthoodAge) {
    return { stay: 0, death, stateChange: 1 - death };
  }

  const rawStateChange = state === "single"
    ? baseUnionProbability(age) * parameters.unionMultiplier
    : state === "partnered"
      ? baseSeparationProbability(age) * parameters.separationMultiplier
      : 0;
  const scale = death + rawStateChange > 1 ? 1 / (death + rawStateChange) : 1;
  const normalizedDeath = death * scale;
  const stateChange = rawStateChange * scale;
  return {
    stay: Math.max(0, 1 - normalizedDeath - stateChange),
    death: normalizedDeath,
    stateChange,
  };
}

function ageCohorts(cohorts) {
  const aged = emptyCohorts();
  for (let age = 0; age <= MAX_POPULATION_AGE; age += 1) {
    aged[Math.min(age + 1, MAX_POPULATION_AGE)] += cohorts[age];
  }
  return aged;
}

export function stepPopulationRuntime(runtime, now = Date.now()) {
  runtime.year += 1;
  const juvenile = ageCohorts(runtime.stocks.juvenile);
  const single = ageCohorts(runtime.stocks.single);
  const partnered = ageCohorts(runtime.stocks.partnered);
  const flows = emptyFlows();

  for (let age = 0; age <= MAX_POPULATION_AGE; age += 1) {
    const juvenileProbability = annualTransitionProbabilities("juvenile", age, runtime.parameters);
    const juvenileDeaths = juvenile[age] * juvenileProbability.death;
    juvenile[age] -= juvenileDeaths;
    flows["juvenile-to-deceased"] += juvenileDeaths;

    const singleProbability = annualTransitionProbabilities("single", age, runtime.parameters);
    const singleDeaths = single[age] * singleProbability.death;
    single[age] -= singleDeaths;
    flows["single-to-deceased"] += singleDeaths;

    const partneredProbability = annualTransitionProbabilities("partnered", age, runtime.parameters);
    const partneredDeaths = partnered[age] * partneredProbability.death;
    partnered[age] -= partneredDeaths;
    flows["partnered-to-deceased"] += partneredDeaths;
  }

  for (let age = runtime.parameters.adulthoodAge; age <= MAX_POPULATION_AGE; age += 1) {
    const maturation = juvenile[age];
    juvenile[age] = 0;
    single[age] += maturation;
    flows["juvenile-to-single"] += maturation;
  }

  const unionFlows = emptyCohorts();
  const separationFlows = emptyCohorts();
  for (let age = 18; age <= MAX_POPULATION_AGE; age += 1) {
    const singleProbability = annualTransitionProbabilities("single", age, runtime.parameters);
    const partneredProbability = annualTransitionProbabilities("partnered", age, runtime.parameters);
    const singleSurvival = 1 - singleProbability.death;
    const partneredSurvival = 1 - partneredProbability.death;
    unionFlows[age] = single[age] * (
      singleSurvival <= Number.EPSILON ? 0 : singleProbability.stateChange / singleSurvival
    );
    separationFlows[age] = partnered[age] * (
      partneredSurvival <= Number.EPSILON ? 0 : partneredProbability.stateChange / partneredSurvival
    );
  }
  for (let age = 18; age <= MAX_POPULATION_AGE; age += 1) {
    single[age] += separationFlows[age] - unionFlows[age];
    partnered[age] += unionFlows[age] - separationFlows[age];
    flows["single-to-partnered"] += unionFlows[age];
    flows["partnered-to-single"] += separationFlows[age];
  }

  let eligiblePartnered = 0;
  for (let age = 18; age <= 44; age += 1) eligiblePartnered += partnered[age];
  const births = (eligiblePartnered / 2) * (runtime.parameters.birthsPerHundredCoupleYears / 100);
  juvenile[0] += births;
  flows["partnered-to-juvenile"] = births;

  const deaths =
    flows["juvenile-to-deceased"] +
    flows["single-to-deceased"] +
    flows["partnered-to-deceased"];
  runtime.stocks = {
    juvenile,
    single,
    partnered,
    deceased: runtime.stocks.deceased + deaths,
  };
  runtime.edgeFlows = flows;
  runtime.revision += 1;
  runtime.serverTime = now;
  return snapshotPopulationRuntime(runtime);
}

function removeProportionally(cohorts, amount) {
  const total = cohorts.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return;
  const retainedRatio = Math.max(0, total - amount) / total;
  for (let age = 0; age < cohorts.length; age += 1) cohorts[age] *= retainedRatio;
}

function addPopulation(runtime, state, amount) {
  if (state === "deceased") {
    runtime.stocks.deceased += amount;
    return;
  }
  const cohorts = runtime.stocks[state];
  const ranges = {
    juvenile: [0, runtime.parameters.adulthoodAge - 1],
    single: [18, 67],
    partnered: [20, 79],
  };
  const [minimumAge, maximumAge] = ranges[state];
  const width = maximumAge - minimumAge + 1;
  for (let index = 0; index < amount; index += 1) {
    const age = minimumAge + ((runtime.injectionCursor + index) % width);
    cohorts[age] += 1;
  }
  runtime.injectionCursor += amount;
}

export function applyPopulationIntervention(runtime, intervention, now = Date.now()) {
  if (intervention.kind === "population" && populationStateIds.includes(intervention.state)) {
    const amount = intervention.amount > 0 ? 5 : intervention.amount < 0 ? -5 : 0;
    if (amount > 0) addPopulation(runtime, intervention.state, amount);
    if (amount < 0) {
      if (intervention.state === "deceased") {
        runtime.stocks.deceased = Math.max(0, runtime.stocks.deceased - 5);
      } else {
        removeProportionally(runtime.stocks[intervention.state], 5);
      }
    }
  } else if (
    intervention.kind === "parameter" &&
    Object.hasOwn(populationParameterRanges, intervention.parameter) &&
    Number.isFinite(intervention.amount)
  ) {
    const [minimum, maximum] = populationParameterRanges[intervention.parameter];
    const next = runtime.parameters[intervention.parameter] + intervention.amount;
    runtime.parameters[intervention.parameter] = intervention.parameter === "adulthoodAge"
      ? Math.round(clamp(next, minimum, maximum))
      : clamp(next, minimum, maximum);
  } else {
    return false;
  }

  runtime.lastIntervention = { ...intervention, appliedAt: now };
  runtime.revision += 1;
  runtime.serverTime = now;
  return true;
}

export function resetPopulationRuntime(runtime, now = Date.now()) {
  Object.assign(runtime, createPopulationRuntime(now));
  return runtime;
}

function cohortTotal(cohorts) {
  return cohorts.reduce((sum, value) => sum + value, 0);
}

export function populationCounts(stocks) {
  return {
    juvenile: cohortTotal(stocks.juvenile),
    single: cohortTotal(stocks.single),
    partnered: cohortTotal(stocks.partnered),
    deceased: stocks.deceased,
  };
}

export function snapshotPopulationRuntime(runtime) {
  const counts = populationCounts(runtime.stocks);
  return {
    runId: runtime.runId,
    revision: runtime.revision,
    serverTime: runtime.serverTime,
    year: runtime.year,
    parameters: { ...runtime.parameters },
    counts,
    livingPopulation: counts.juvenile + counts.single + counts.partnered,
    cohorts: {
      juvenile: [...runtime.stocks.juvenile],
      single: [...runtime.stocks.single],
      partnered: [...runtime.stocks.partnered],
    },
    edgeFlows: { ...runtime.edgeFlows },
    lastIntervention: runtime.lastIntervention ? { ...runtime.lastIntervention } : null,
  };
}
