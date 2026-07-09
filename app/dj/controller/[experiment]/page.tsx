import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DjController from "@/components/dj/1/controller";
import DjReactionController from "@/components/dj/2/controller";
import {
  djExperiments,
  type DjExperimentSlug,
  isDjExperimentSlug,
} from "@/components/dj/experiments";

const components: Record<DjExperimentSlug, ComponentType> = {
  "1": DjController,
  "2": DjReactionController,
};

export function generateStaticParams() {
  return djExperiments.map((experiment) => ({
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
    title: `dj controller ${experiment}`,
  };
}

export default async function DjControllerPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isDjExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
