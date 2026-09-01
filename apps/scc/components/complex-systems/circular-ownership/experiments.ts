export const circularOwnershipExperiments = [
  { slug: "1", label: "circular-ownership/1" },
] as const;

export type CircularOwnershipExperimentSlug =
  (typeof circularOwnershipExperiments)[number]["slug"];

export function isCircularOwnershipExperimentSlug(
  value: string,
): value is CircularOwnershipExperimentSlug {
  return circularOwnershipExperiments.some((experiment) => experiment.slug === value);
}
