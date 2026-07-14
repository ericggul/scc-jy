import { fingerSkatingExperiment } from "./finger-skating.mjs";
import { djExperiment } from "./dj.mjs";
import { calendarExperiment } from "./calendar.mjs";
import { stockExperiment } from "./stock.mjs";
import { networkSystemMacroEconomyExperiment } from "./network-system-macro-economy.mjs";
import { networkSystemCycleExperiment } from "./network-system-cycle.mjs";
import { networkSystemDefaultExperiment } from "./network-system-default.mjs";
import { networkSystemPopulationExperiment } from "./network-system-population.mjs";
import { networkSystemCompetitiveFirmsExperiment } from "./network-system-competitive-firms.mjs";

export const experiments = [
  fingerSkatingExperiment,
  djExperiment,
  calendarExperiment,
  stockExperiment,
  networkSystemMacroEconomyExperiment,
  networkSystemCycleExperiment,
  networkSystemDefaultExperiment,
  networkSystemPopulationExperiment,
  networkSystemCompetitiveFirmsExperiment,
];
