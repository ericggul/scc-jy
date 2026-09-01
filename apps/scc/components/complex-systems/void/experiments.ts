export const voidExperiments = [
  { slug: "1", label: "void / 1" },
  { slug: "2", label: "void / 2" },
  { slug: "3", label: "void / 3" },
] as const;

export type VoidExperimentSlug = (typeof voidExperiments)[number]["slug"];

export function isVoidExperimentSlug(
  value: string,
): value is VoidExperimentSlug {
  return voidExperiments.some((experiment) => experiment.slug === value);
}
