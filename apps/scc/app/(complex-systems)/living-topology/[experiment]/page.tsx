import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import LivingTopologyOne from "@/components/complex-systems/living-topology/1";
import LivingTopologyTwo from "@/components/complex-systems/living-topology/2";
import LivingTopologyThree from "@/components/complex-systems/living-topology/3";
import LivingTopologyFour from "@/components/complex-systems/living-topology/4";
import LivingTopologyFive from "@/components/complex-systems/living-topology/5";
import {
  isLivingTopologyExperimentSlug,
  livingTopologyExperiments,
  type LivingTopologyExperimentSlug,
} from "@/components/complex-systems/living-topology/experiments";

const components: Record<LivingTopologyExperimentSlug, ComponentType> = {
  "1": LivingTopologyOne,
  "2": LivingTopologyTwo,
  "3": LivingTopologyThree,
  "4": LivingTopologyFour,
  "5": LivingTopologyFive,
};

export function generateStaticParams() {
  return livingTopologyExperiments.map((experiment) => ({
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
    title: `living topology ${experiment}`,
    description: "A graph whose activity continually reorganizes its topology.",
  };
}

export default async function LivingTopologyExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isLivingTopologyExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
