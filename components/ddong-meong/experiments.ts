export const ddongMeongExperiments = [
  {
    slug: "1",
    label: "ddong-meong/1",
    status: "archive",
  },
  {
    slug: "2",
    label: "ddong-meong/2",
    status: "working",
  },
] as const;

export type DdongMeongExperimentSlug =
  (typeof ddongMeongExperiments)[number]["slug"];

export function isDdongMeongExperimentSlug(
  value: string,
): value is DdongMeongExperimentSlug {
  return ddongMeongExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
