import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Goldfishes3DOne from "@/components/goldfishes/3d/1";
import {
  goldfish3DExperiments,
  isGoldfish3DExperimentSlug,
} from "@/components/goldfishes/experiments";

export function generateStaticParams() {
  return goldfish3DExperiments.map((experiment) => ({
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
    title: `goldfishes 3d ${experiment}`,
    description:
      "A perspective 3D rendering of the interactive goldfish field with the same cell-selection behavior.",
  };
}

export default async function Goldfishes3DExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isGoldfish3DExperimentSlug(experiment)) {
    notFound();
  }

  return <Goldfishes3DOne />;
}
