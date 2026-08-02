export const cValScreenIds = [
  "market",
  "news",
  "media",
  "employment",
] as const;

export type CValScreenId = (typeof cValScreenIds)[number];

export const cValExperiments = [
  {
    version: "1",
    label: "c-val/1",
    status: "stable",
    screenIds: cValScreenIds,
  },
  {
    version: "2",
    label: "c-val/2",
    status: "experimental",
    screenIds: cValScreenIds,
  },
] as const;

export type CValVersion = (typeof cValExperiments)[number]["version"];

export function isCValVersion(value: string): value is CValVersion {
  return cValExperiments.some(({ version }) => version === value);
}

export function isCValScreenId(value: string): value is CValScreenId {
  return cValScreenIds.some((screenId) => screenId === value);
}

export function isCValScreenRoute(
  version: CValVersion,
  value: string,
): value is CValScreenId | "whole" {
  const experiment = cValExperiments.find(
    (candidate) => candidate.version === version,
  );
  return (
    value === "whole" ||
    Boolean(experiment?.screenIds.some((screenId) => screenId === value))
  );
}
