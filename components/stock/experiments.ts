export const stockExperiments = [
  { slug: "1", label: "stock/1" },
  { slug: "2", label: "stock/2" },
] as const;

export const stockMultiDeviceExperiments = [
  { slug: "1", label: "stock/1" },
] as const;

export type StockExperimentSlug = (typeof stockExperiments)[number]["slug"];

export function isStockExperimentSlug(
  value: string,
): value is StockExperimentSlug {
  return stockExperiments.some((experiment) => experiment.slug === value);
}

export type StockMultiDeviceExperimentSlug =
  (typeof stockMultiDeviceExperiments)[number]["slug"];

export function isStockMultiDeviceExperimentSlug(
  value: string,
): value is StockMultiDeviceExperimentSlug {
  return stockMultiDeviceExperiments.some(
    (experiment) => experiment.slug === value,
  );
}

export const stockDirectRoutes = ["default", "1", "2"] as const;
export type StockDirectRoute = (typeof stockDirectRoutes)[number];

export function isStockDirectRoute(value: string): value is StockDirectRoute {
  return stockDirectRoutes.some((route) => route === value);
}
