import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import ConstellationOne from "@/components/complex-systems/constellation/1";
import {
  constellationExperiments,
  isConstellationExperimentSlug,
  type ConstellationExperimentSlug,
} from "@/components/complex-systems/constellation/experiments";

const components: Record<ConstellationExperimentSlug, ComponentType> = {
  "1": ConstellationOne,
};

export function generateStaticParams() {
  return constellationExperiments.map((experiment) => ({
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
    description: "A resource-limited adaptive network of stars and relations.",
  };
}

export default async function ConstellationExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isConstellationExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
