import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import FlightNetworkOne from "@/components/complex-systems/flight-network/1";
import {
  flightNetworkExperiments,
  isFlightNetworkExperimentSlug,
  type FlightNetworkExperimentSlug,
} from "@/components/complex-systems/flight-network/experiments";

const components: Record<FlightNetworkExperimentSlug, ComponentType> = {
  "1": FlightNetworkOne,
};

export function generateStaticParams() {
  return flightNetworkExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `flight network ${experiment}`,
    description:
      "A synthetic world where city demand creates routes and moving flights.",
  };
}

export default async function FlightNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isFlightNetworkExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
