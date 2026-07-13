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

export type NetworkSystemScreenId = (typeof networkSystemScreenIds)[number];
export type NetworkSystemScreenRoute = NetworkSystemScreenId | "whole";

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
  return value === "whole" || Boolean(screenIds?.includes(value as NetworkSystemScreenId));
}
