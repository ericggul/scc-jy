export const flightNetworkExperiments = [
  { slug: "1", label: "flight-network/1" },
] as const;

export type FlightNetworkExperimentSlug =
  (typeof flightNetworkExperiments)[number]["slug"];

export function isFlightNetworkExperimentSlug(
  value: string,
): value is FlightNetworkExperimentSlug {
  return flightNetworkExperiments.some(
    (experiment) => experiment.slug === value,
  );
}
