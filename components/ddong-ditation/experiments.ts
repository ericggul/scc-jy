export const ddongDitationExperiments = [
  {
    slug: "1",
    label: "ddong-ditation/1",
  },
  {
    slug: "2",
    label: "ddong-ditation/2",
  },
] as const;

export type DdongDitationExperimentSlug =
  (typeof ddongDitationExperiments)[number]["slug"];

export function isDdongDitationExperimentSlug(
  value: string,
): value is DdongDitationExperimentSlug {
  return ddongDitationExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
