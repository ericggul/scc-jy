import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TemporalRepairRelay from "@/components/complex-systems/temporal-network/repair-relay";
import {
  isTemporalNetworkExperimentSlug,
  temporalNetworkExperiments,
} from "@/components/complex-systems/temporal-network/experiments";

export function generateStaticParams() {
  return temporalNetworkExperiments.map((experiment) => ({
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
    title: "complex-systems",
    description: "A synthetic repair network constrained by time-respecting contacts.",
  };
}

export default async function TemporalNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isTemporalNetworkExperimentSlug(experiment)) notFound();
  return <TemporalRepairRelay />;
}
