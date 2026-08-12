export const cValOneScreenIds = [
  "rollercoaster",
  "news",
  "media",
] as const;
export const cValOneStandaloneScreenIds = ["casino", "comments"] as const;
export const cValOneArchivedScreenIds = ["comments-legacy"] as const;

export const cValTwoScreenIds = ["news", "media"] as const;
export const cValTwoStandaloneScreenIds = ["comments"] as const;
export const cValTwoArchivedScreenIds = ["comments-legacy"] as const;

export type CValOneScreenId =
  | (typeof cValOneScreenIds)[number]
  | (typeof cValOneStandaloneScreenIds)[number]
  | (typeof cValOneArchivedScreenIds)[number];
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
    standaloneScreenIds: cValOneStandaloneScreenIds,
    archivedScreenIds: cValOneArchivedScreenIds,
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
  return (
    cValOneScreenIds.some((screenId) => screenId === value) ||
    cValOneStandaloneScreenIds.some((screenId) => screenId === value) ||
    cValOneArchivedScreenIds.some((screenId) => screenId === value)
  );
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
