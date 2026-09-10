import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DiffusionGraphOne from "@/components/complex-systems/diffusion-graph/1";
import {
  diffusionGraphExperiments,
  isDiffusionGraphExperimentSlug,
  type DiffusionGraphExperimentSlug,
} from "@/components/complex-systems/diffusion-graph/experiments";

const components: Record<DiffusionGraphExperimentSlug, typeof DiffusionGraphOne> = {
  "1": DiffusionGraphOne,
};

export function generateStaticParams() {
  return diffusionGraphExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "diffusion-graph",
    description: "A directed lattice where value diffuses through active links as they rewire.",
  };
}

export default async function DiffusionGraphExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isDiffusionGraphExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
