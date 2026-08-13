export const tokyoNetworkExperiments = [
  { slug: "1", label: "tokyo network / 1" },
] as const;

export type TokyoNetworkExperimentSlug =
  (typeof tokyoNetworkExperiments)[number]["slug"];

export function isTokyoNetworkExperimentSlug(
  value: string,
): value is TokyoNetworkExperimentSlug {
  return tokyoNetworkExperiments.some((experiment) => experiment.slug === value);
}
