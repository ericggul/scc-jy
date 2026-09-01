export const fingerSkatingGroups = [
  {
    slug: "default",
    label: "default",
    experiments: [
      { slug: "1", label: "finger-skating/default/1" },
      { slug: "2", label: "finger-skating/default/2" },
    ],
  },
  {
    slug: "field",
    label: "field",
    experiments: [{ slug: "1", label: "finger-skating/field/1" }],
  },
] as const;

export type FingerSkatingGroupSlug =
  (typeof fingerSkatingGroups)[number]["slug"];

export function isFingerSkatingGroupSlug(
  value: string,
): value is FingerSkatingGroupSlug {
  return fingerSkatingGroups.some((group) => group.slug === value);
}

export function isFingerSkatingExperimentSlug(
  groupSlug: FingerSkatingGroupSlug,
  value: string,
) {
  return fingerSkatingGroups
    .find((group) => group.slug === groupSlug)
    ?.experiments.some((experiment) => experiment.slug === value) ?? false;
}

export function getFingerSkatingExperiments(groupSlug: FingerSkatingGroupSlug) {
  return fingerSkatingGroups.find((group) => group.slug === groupSlug)
    ?.experiments;
}
