export const smileExperiments = [
  { slug: "1", label: "ui/smile/1" },
] as const;

export type SmileExperimentSlug = (typeof smileExperiments)[number]["slug"];

export function isSmileExperimentSlug(
  value: string,
): value is SmileExperimentSlug {
  return smileExperiments.some(({ slug }) => slug === value);
}
