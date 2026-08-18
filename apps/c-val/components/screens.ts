export const cValScreenIds = ["news", "media", "comments", "comments-legacy"] as const;

export type CValScreenId = (typeof cValScreenIds)[number];

export function isCValScreenRoute(value: string): value is CValScreenId | "whole" {
  return value === "whole" || cValScreenIds.some((screenId) => screenId === value);
}
