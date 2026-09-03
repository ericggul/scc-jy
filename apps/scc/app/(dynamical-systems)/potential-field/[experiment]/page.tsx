import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PotentialFieldOne from "@/components/dynamical-systems/potential-field/1";
import {
  isPotentialFieldExperimentSlug,
  potentialFieldExperiments,
} from "@/components/dynamical-systems/potential-field/experiments";

export function generateStaticParams() {
  return potentialFieldExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "potential-field/1",
  description:
    "A WebGPU and TSL potential-gradient field with collision-resolved portrait spheres.",
};

export default async function PotentialFieldExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isPotentialFieldExperimentSlug(experiment)) notFound();
  return <PotentialFieldOne />;
}
