export const antColonyExperiments = [
  { slug: "1", label: "ant-colony/1" },
] as const;

export type AntColonyExperimentSlug =
  (typeof antColonyExperiments)[number]["slug"];

export function isAntColonyExperimentSlug(
  value: string,
): value is AntColonyExperimentSlug {
  return antColonyExperiments.some((experiment) => experiment.slug === value);
}
