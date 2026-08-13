import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import HypertextNetworkOne from "@/components/complex-systems/hypertext-network/1";
import {
  hypertextNetworkExperiments,
  isHypertextNetworkExperimentSlug,
  type HypertextNetworkExperimentSlug,
} from "@/components/complex-systems/hypertext-network/experiments";

const components: Record<HypertextNetworkExperimentSlug, ComponentType> = {
  "1": HypertextNetworkOne,
};

export function generateStaticParams() {
  return hypertextNetworkExperiments.map((experiment) => ({
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
    title: `hypertext network ${experiment}`,
    description:
      "A self-evolving field of page fragments, links, and travelling readers.",
  };
}

export default async function HypertextNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isHypertextNetworkExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
