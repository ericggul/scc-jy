export const stockExperiments = [
  { slug: "1", label: "stock/1", reference: "terminal command center" },
  { slug: "2", label: "stock/2", reference: "consumer watchlist" },
  { slug: "3", label: "stock/3", reference: "institutional graph wall" },
  { slug: "4", label: "stock/4", reference: "options flow cockpit" },
  { slug: "5", label: "stock/5", reference: "portfolio brief" },
] as const;

export type StockExperimentSlug = (typeof stockExperiments)[number]["slug"];

export function isStockExperimentSlug(
  value: string,
): value is StockExperimentSlug {
  return stockExperiments.some((experiment) => experiment.slug === value);
}

