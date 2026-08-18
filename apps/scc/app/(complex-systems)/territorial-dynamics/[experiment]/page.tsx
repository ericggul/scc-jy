import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TerritorialDynamicsOne from "@/components/complex-systems/territorial-dynamics/1";
import {
  isTerritorialDynamicsExperimentSlug,
  territorialDynamicsExperiments,
} from "@/components/complex-systems/territorial-dynamics/experiments";

export function generateStaticParams() {
  return territorialDynamicsExperiments.map((experiment) => ({
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
    description:
      "Fictional nations expand, fight, form alliances, and betray one another across a procedural map.",
  };
}

export default async function TerritorialDynamicsExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isTerritorialDynamicsExperimentSlug(experiment)) notFound();
  return <TerritorialDynamicsOne />;
}
