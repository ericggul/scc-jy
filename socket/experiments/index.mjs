import { calendarExperiment } from "./calendar/index.mjs";
import { ddongMeongOneExperiment } from "../../apps/ddong-meong/socket/experiments/1/index.mjs";
import { ddongMeongTwoExperiment } from "../../apps/ddong-meong/socket/experiments/2/index.mjs";
import { ddongMeongThreeExperiment } from "../../apps/ddong-meong/socket/experiments/3/index.mjs";
import { ddongMeongFourExperiment } from "../../apps/ddong-meong/socket/experiments/4/index.mjs";
import { djExperiment } from "./dj/index.mjs";
import { fingerSkatingExperiment } from "./finger-skating/index.mjs";
import { networkSystemCompetitiveFirmsExperiment } from "./network-system/competitive-firms/index.mjs";
import { cValOneExperiment } from "../../apps/c-val/socket/experiments/1/index.mjs";
import { cValTwoExperiment } from "../../apps/c-val/socket/experiments/2/index.mjs";
import { networkSystemCycleExperiment } from "./network-system/cycle/index.mjs";
import { networkSystemDefaultExperiment } from "./network-system/default/index.mjs";
import { networkSystemMacroEconomyExperiment } from "./network-system/macro-economy/index.mjs";
import { networkSystemPopulationExperiment } from "./network-system/population/index.mjs";
import { stockExperiment } from "./stock/index.mjs";

const sccExperiments = [
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

const cValExperiments = [cValOneExperiment, cValTwoExperiment];
const ddongMeongExperiments = [
  ddongMeongOneExperiment,
  ddongMeongTwoExperiment,
  ddongMeongThreeExperiment,
  ddongMeongFourExperiment,
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

export const experiments = validateExperimentRegistry([
  ...ddongMeongExperiments,
  fingerSkatingExperiment,
  djExperiment,
  calendarExperiment,
  stockExperiment,
  networkSystemMacroEconomyExperiment,
  ...cValExperiments,
  networkSystemCycleExperiment,
  networkSystemDefaultExperiment,
  networkSystemPopulationExperiment,
  networkSystemCompetitiveFirmsExperiment,
]);

export const experimentRegistries = Object.freeze({
  all: experiments,
  "c-val": validateExperimentRegistry(cValExperiments),
  "ddong-meong": validateExperimentRegistry(ddongMeongExperiments),
  scc: validateExperimentRegistry(sccExperiments),
});
