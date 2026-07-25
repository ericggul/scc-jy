import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import Goldfishes2DOne from "@/components/goldfishes/2d/1";
import Goldfishes2DTwo from "@/components/goldfishes/2d/2";
import {
  goldfish2DExperiments,
  isGoldfish2DExperimentSlug,
  type Goldfish2DExperimentSlug,
} from "@/components/goldfishes/experiments";

const components: Record<Goldfish2DExperimentSlug, ComponentType> = {
  "1": Goldfishes2DOne,
  "2": Goldfishes2DTwo,
};

export function generateStaticParams() {
  return goldfish2DExperiments.map((experiment) => ({
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
    title: `goldfishes 2d ${experiment}`,
    description:
      "An interactive two-dimensional cursor and goldfish field around selected cells.",
  };
}

export default async function Goldfishes2DExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isGoldfish2DExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
