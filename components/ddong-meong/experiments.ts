export const ddongMeongExperiments = [
  {
    slug: "1",
    label: "ddong-meong/1",
    status: "archive",
  },
  {
    slug: "2",
    label: "ddong-meong/2",
    status: "archive",
  },
  {
    slug: "3",
    label: "ddong-meong/3",
    status: "working",
  },
  {
    slug: "4",
    label: "ddong-meong/4",
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
