export const tableExperiments = [{ slug: "1", label: "table/1" }] as const;

export type TableExperimentSlug = (typeof tableExperiments)[number]["slug"];

export function isTableExperimentSlug(
  value: string,
): value is TableExperimentSlug {
  return tableExperiments.some((experiment) => experiment.slug === value);
}
