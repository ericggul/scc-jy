import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import MomaOne from "@/components/standalone/moma/1";
import MomaTwo from "@/components/standalone/moma/2";
import {
  isMomaExperimentSlug,
  momaExperiments,
  type MomaExperimentSlug,
} from "@/components/standalone/moma/experiments";

const components: Record<MomaExperimentSlug, ComponentType> = {
  "1": MomaOne,
  "2": MomaTwo,
};

export function generateStaticParams() {
  return momaExperiments.map((experiment) => ({
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
    title: `moma ${experiment}`,
  };
}

export default async function MomaExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isMomaExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
