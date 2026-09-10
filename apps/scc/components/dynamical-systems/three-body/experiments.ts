export const threeBodyExperiments = [
  { slug: "1", label: "three body / 1" },
  { slug: "2", label: "three body / 2" },
] as const;

export type ThreeBodyExperimentSlug =
  (typeof threeBodyExperiments)[number]["slug"];

export function isThreeBodyExperimentSlug(
  value: string,
): value is ThreeBodyExperimentSlug {
  return threeBodyExperiments.some((experiment) => experiment.slug === value);
}
