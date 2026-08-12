export const macosExperiments = [
  { slug: "1", label: "macos/1" },
] as const;

export type MacosExperimentSlug = (typeof macosExperiments)[number]["slug"];

export function isMacosExperimentSlug(
  value: string,
): value is MacosExperimentSlug {
  return macosExperiments.some((experiment) => experiment.slug === value);
}
