export const financialNetworkExperiments = [
  { slug: "1", label: "financial-network/1" },
  { slug: "2", label: "financial-network/2" },
  { slug: "3", label: "financial-network/3" },
  { slug: "4", label: "financial-network/4" },
  { slug: "5", label: "financial-network/5" },
] as const;

export type FinancialNetworkExperimentSlug =
  (typeof financialNetworkExperiments)[number]["slug"];

export function isFinancialNetworkExperimentSlug(
  value: string,
): value is FinancialNetworkExperimentSlug {
  return financialNetworkExperiments.some(({ slug }) => slug === value);
}
