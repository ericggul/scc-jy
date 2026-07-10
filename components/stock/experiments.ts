export const stockExperiments = [
  { slug: "1", label: "stock/1" },
] as const;

export type StockExperimentSlug = (typeof stockExperiments)[number]["slug"];

export function isStockExperimentSlug(
  value: string,
): value is StockExperimentSlug {
  return stockExperiments.some((experiment) => experiment.slug === value);
}
