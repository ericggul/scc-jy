export const tableExperiments = [
  { slug: "1", label: "table/1" },
  { slug: "2", label: "table/2" },
] as const;

export type TableExperimentSlug = (typeof tableExperiments)[number]["slug"];

export function isTableExperimentSlug(
  value: string,
): value is TableExperimentSlug {
  return tableExperiments.some((experiment) => experiment.slug === value);
}
