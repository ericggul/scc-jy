export const djExperiments = [{ slug: "1", label: "dj/1" }] as const;

export type DjExperimentSlug = (typeof djExperiments)[number]["slug"];

export function isDjExperimentSlug(value: string): value is DjExperimentSlug {
  return djExperiments.some((experiment) => experiment.slug === value);
}

export const djScreenIds = ["1", "2", "3", "4"] as const;

export type DjScreenId = (typeof djScreenIds)[number];
export type DjScreenRoute = DjScreenId | "whole";

export function isDjScreenId(value: string): value is DjScreenId {
  return djScreenIds.some((screenId) => screenId === value);
}

export function isDjScreenRoute(value: string): value is DjScreenRoute {
  return value === "whole" || isDjScreenId(value);
}
