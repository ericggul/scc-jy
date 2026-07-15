import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SwarmOne from "@/components/standalone/swarm/1";
import SwarmTwo from "@/components/standalone/swarm/2";
import {
  isSwarmExperimentSlug,
  swarmExperiments,
  type SwarmExperimentSlug,
} from "@/components/standalone/swarm/experiments";

const components: Record<SwarmExperimentSlug, ComponentType> = {
  "1": SwarmOne,
  "2": SwarmTwo,
};

export function generateStaticParams() {
  return swarmExperiments.map((experiment) => ({
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
    title: `swarm ${experiment}`,
    description: "A minimal, interactive Boids swarm simulation.",
  };
}

export default async function SwarmExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isSwarmExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
