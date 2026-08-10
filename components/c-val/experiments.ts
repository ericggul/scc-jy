export const cValOneScreenIds = [
  "market",
  "news",
  "media",
  "employment",
] as const;

export const cValTwoScreenIds = ["rollercoaster", "news", "media"] as const;
export const cValTwoStandaloneScreenIds = ["casino"] as const;
export const cValTwoArchivedScreenIds = ["rollercoaster-legacy", "casino-legacy"] as const;

export type CValOneScreenId = (typeof cValOneScreenIds)[number];
export type CValTwoScreenId =
  | (typeof cValTwoScreenIds)[number]
  | (typeof cValTwoStandaloneScreenIds)[number]
  | (typeof cValTwoArchivedScreenIds)[number];
export type CValScreenId = CValOneScreenId | CValTwoScreenId;

export const cValExperiments = [
  {
    version: "1",
    label: "c-val/1",
    status: "stable",
    screenIds: cValOneScreenIds,
    standaloneScreenIds: [],
    archivedScreenIds: [],
  },
  {
    version: "2",
    label: "c-val/2",
    status: "experimental",
    screenIds: cValTwoScreenIds,
    standaloneScreenIds: cValTwoStandaloneScreenIds,
    archivedScreenIds: cValTwoArchivedScreenIds,
  },
] as const;

export type CValVersion = (typeof cValExperiments)[number]["version"];

export function isCValVersion(value: string): value is CValVersion {
  return cValExperiments.some(({ version }) => version === value);
}

export function isCValScreenId(value: string): value is CValScreenId {
  return isCValOneScreenId(value) || isCValTwoScreenId(value);
}

export function isCValOneScreenId(value: string): value is CValOneScreenId {
  return cValOneScreenIds.some((screenId) => screenId === value);
}

export function isCValTwoScreenId(value: string): value is CValTwoScreenId {
  return (
    cValTwoScreenIds.some((screenId) => screenId === value) ||
    cValTwoStandaloneScreenIds.some((screenId) => screenId === value) ||
    cValTwoArchivedScreenIds.some((screenId) => screenId === value)
  );
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
    Boolean(
      experiment?.screenIds.some((screenId) => screenId === value) ||
      experiment?.standaloneScreenIds.some((screenId) => screenId === value) ||
      experiment?.archivedScreenIds.some((screenId) => screenId === value),
    )
  );
}
