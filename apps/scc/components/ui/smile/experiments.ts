export const smileExperiments = [
  { slug: "1", label: "ui/smile/1" },
  { slug: "2", label: "ui/smile/2" },
] as const;

export type SmileExperimentSlug = (typeof smileExperiments)[number]["slug"];

export function isSmileExperimentSlug(
  value: string,
): value is SmileExperimentSlug {
  return smileExperiments.some(({ slug }) => slug === value);
}
