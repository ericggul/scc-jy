export const normalDistributionExperiments = [
  { slug: "1", label: "normal distribution / 1" },
  { slug: "2", label: "normal distribution / 2" },
] as const;

export type NormalDistributionExperimentSlug =
  (typeof normalDistributionExperiments)[number]["slug"];

export function isNormalDistributionExperimentSlug(
  value: string,
): value is NormalDistributionExperimentSlug {
  return normalDistributionExperiments.some((experiment) => experiment.slug === value);
}
