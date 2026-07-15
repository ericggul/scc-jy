export const momaExperiments = [
  { slug: "1", label: "moma/1" },
  { slug: "2", label: "moma/2" },
] as const;

export type MomaExperimentSlug = (typeof momaExperiments)[number]["slug"];

export function isMomaExperimentSlug(
  value: string,
): value is MomaExperimentSlug {
  return momaExperiments.some((experiment) => experiment.slug === value);
}
