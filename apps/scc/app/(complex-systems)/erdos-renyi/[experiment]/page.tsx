import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import ErdosRenyiOne from "@/components/complex-systems/erdos-renyi/1";
import {
  erdosRenyiExperiments,
  isErdosRenyiExperimentSlug,
  type ErdosRenyiExperimentSlug,
} from "@/components/complex-systems/erdos-renyi/experiments";

const components: Record<ErdosRenyiExperimentSlug, ComponentType> = {
  "1": ErdosRenyiOne,
};

export function generateStaticParams() {
  return erdosRenyiExperiments.map((experiment) => ({
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
    title: "Erdős–Rényi random graph",
    description:
      "A seeded G(n,p) graph where every possible undirected edge is independently sampled.",
  };
}

export default async function ErdosRenyiExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isErdosRenyiExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
