import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import BarabasiAlbertOne from "@/components/complex-systems/barabasi-albert/1";
import {
  barabasiAlbertExperiments,
  isBarabasiAlbertExperimentSlug,
  type BarabasiAlbertExperimentSlug,
} from "@/components/complex-systems/barabasi-albert/experiments";

const components: Record<BarabasiAlbertExperimentSlug, ComponentType> = {
  "1": BarabasiAlbertOne,
};

export function generateStaticParams() {
  return barabasiAlbertExperiments.map((experiment) => ({
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
    title: "Barabási–Albert network growth",
    description:
      "A growing graph where each newcomer preferentially attaches to well-connected vertices.",
  };
}

export default async function BarabasiAlbertExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isBarabasiAlbertExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
