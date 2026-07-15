export const networkSystemExperiments = [
  {
    slug: "default",
    label: "network-system/default",
    screenIds: ["1", "2", "3", "4"],
  },
  {
    slug: "macro-economy",
    label: "network-system/macro-economy",
    screenIds: ["1", "2", "3", "4"],
  },
  {
    slug: "cycle",
    label: "network-system/cycle",
    screenIds: [
      "news",
      "employment",
      "employment-2",
      "graphs",
      "graphs-2",
      "left",
      "right",
    ],
  },
  {
    slug: "population",
    label: "network-system/population",
    screenIds: ["1", "2", "3", "4"],
  },
  {
    slug: "competitive-firms",
    label: "network-system/competitive-firms",
    screenIds: ["1", "2", "3", "4"],
  },
] as const;

export type NetworkSystemExperimentSlug =
  (typeof networkSystemExperiments)[number]["slug"];

export const networkSystemScreenIds = ["1", "2", "3", "4"] as const;

export const cycleMediaScreenIds = ["left", "right"] as const;
export const cycleNewsScreenIds = ["news"] as const;
export const cycleEmploymentScreenIds = ["employment", "employment-2"] as const;
export const cycleGraphScreenIds = ["graphs", "graphs-2"] as const;

export type NetworkSystemScreenId = (typeof networkSystemScreenIds)[number];
export type CycleMediaScreenId = (typeof cycleMediaScreenIds)[number];
export type CycleNewsScreenId = (typeof cycleNewsScreenIds)[number];
export type CycleEmploymentScreenId =
  (typeof cycleEmploymentScreenIds)[number];
export type CycleGraphScreenId = (typeof cycleGraphScreenIds)[number];
export type NetworkSystemScreenRoute =
  | NetworkSystemScreenId
  | CycleMediaScreenId
  | CycleNewsScreenId
  | CycleEmploymentScreenId
  | CycleGraphScreenId
  | "whole";

export function isNetworkSystemExperimentSlug(
  value: string,
): value is NetworkSystemExperimentSlug {
  return networkSystemExperiments.some(
    (experiment) => experiment.slug === value,
  );
}

export function isNetworkSystemScreenId(
  value: string,
): value is NetworkSystemScreenId {
  return networkSystemScreenIds.some((screenId) => screenId === value);
}

export function isCycleMediaScreenId(
  value: string,
): value is CycleMediaScreenId {
  return cycleMediaScreenIds.some((screenId) => screenId === value);
}

export function isCycleNewsScreenId(
  value: string,
): value is CycleNewsScreenId {
  return cycleNewsScreenIds.some((screenId) => screenId === value);
}

export function isCycleEmploymentScreenId(
  value: string,
): value is CycleEmploymentScreenId {
  return cycleEmploymentScreenIds.some((screenId) => screenId === value);
}

export function isCycleGraphScreenId(
  value: string,
): value is CycleGraphScreenId {
  return cycleGraphScreenIds.some((screenId) => screenId === value);
}

export function getNetworkSystemScreenIds(
  experimentSlug: NetworkSystemExperimentSlug,
) {
  return networkSystemExperiments.find(
    (experiment) => experiment.slug === experimentSlug,
  )?.screenIds;
}

export function isNetworkSystemScreenRoute(
  experimentSlug: NetworkSystemExperimentSlug,
  value: string,
): value is NetworkSystemScreenRoute {
  const screenIds = getNetworkSystemScreenIds(experimentSlug);
  return (
    value === "whole" ||
    Boolean(screenIds?.some((screenId) => screenId === value))
  );
}
