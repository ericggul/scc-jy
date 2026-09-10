export const financialNetworkExperiments = [
  { slug: "1", label: "financial-network/1" },
] as const;

export function isFinancialNetworkExperimentSlug(value: string) {
  return financialNetworkExperiments.some(({ slug }) => slug === value);
}
