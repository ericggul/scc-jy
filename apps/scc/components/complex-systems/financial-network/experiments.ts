export const financialNetworkExperiments = [
  { slug: "1", label: "financial-network/1" },
  { slug: "2", label: "financial-network/2" },
] as const;

export type FinancialNetworkExperimentSlug =
  (typeof financialNetworkExperiments)[number]["slug"];

export function isFinancialNetworkExperimentSlug(
  value: string,
): value is FinancialNetworkExperimentSlug {
  return financialNetworkExperiments.some(({ slug }) => slug === value);
}
