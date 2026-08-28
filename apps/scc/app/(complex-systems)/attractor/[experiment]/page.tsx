import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AttractorSequenceOne from "@/components/complex-systems/attractor/1";
import {
  attractorExperiments,
  isAttractorExperimentSlug,
} from "@/components/complex-systems/attractor/experiments";

export function generateStaticParams() {
  return attractorExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "attractor/1",
  description:
    "A six-part field of independently integrated finance, Dadras, Bouali, Aizawa, Nosé–Hoover, and Thomas trajectories.",
};

export default async function AttractorExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isAttractorExperimentSlug(experiment)) notFound();
  return <AttractorSequenceOne />;
}
