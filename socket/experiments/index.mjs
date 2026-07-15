import { calendarExperiment } from "./calendar/index.mjs";
import { djExperiment } from "./dj/index.mjs";
import { fingerSkatingExperiment } from "./finger-skating/index.mjs";
import { networkSystemCompetitiveFirmsExperiment } from "./network-system/competitive-firms/index.mjs";
import { networkSystemCycleExperiment } from "./network-system/cycle/index.mjs";
import { networkSystemDefaultExperiment } from "./network-system/default/index.mjs";
import { networkSystemMacroEconomyExperiment } from "./network-system/macro-economy/index.mjs";
import { networkSystemPopulationExperiment } from "./network-system/population/index.mjs";
import { stockExperiment } from "./stock/index.mjs";

const registeredExperiments = [
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

function validateExperimentRegistry(items) {
  const ids = new Set();
  const eventNames = new Set();

  for (const experiment of items) {
    if (!experiment?.id || typeof experiment.register !== "function") {
      throw new TypeError("Invalid socket experiment registration");
    }
    if (ids.has(experiment.id)) {
      throw new Error(`Duplicate socket experiment id: ${experiment.id}`);
    }
    ids.add(experiment.id);

    for (const eventName of Object.values(experiment.events ?? {})) {
      if (eventNames.has(eventName)) {
        throw new Error(`Duplicate socket event name: ${eventName}`);
      }
      eventNames.add(eventName);
    }
  }

  return Object.freeze([...items]);
}

export const experiments = validateExperimentRegistry(registeredExperiments);
