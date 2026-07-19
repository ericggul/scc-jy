import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SwarmOne from "@/components/standalone/swarm/1";
import SwarmTwo from "@/components/standalone/swarm/2";
import SwarmThree from "@/components/standalone/swarm/3";
import SwarmFour from "@/components/standalone/swarm/4";
import SwarmFive from "@/components/standalone/swarm/5";
import SwarmSix from "@/components/standalone/swarm/6";
import {
  isSwarmExperimentSlug,
  swarmExperiments,
  type SwarmExperimentSlug,
} from "@/components/standalone/swarm/experiments";

const components: Record<SwarmExperimentSlug, ComponentType> = {
  "1": SwarmOne,
  "2": SwarmTwo,
  "3": SwarmThree,
  "4": SwarmFour,
  "5": SwarmFive,
  "6": SwarmSix,
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
    description:
      experiment === "6"
        ? "A side-view goldfish rendering of the interactive cursor-cell swarm."
        : experiment === "4" || experiment === "5"
        ? "A minimal interactive field of cursor marks around a forbidden cell."
        : "A minimal, interactive Boids swarm simulation.",
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
