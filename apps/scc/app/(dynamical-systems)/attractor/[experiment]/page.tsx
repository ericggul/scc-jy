import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AttractorSequenceOne from "@/components/dynamical-systems/attractor/1";
import AttractorSequenceTwo from "@/components/dynamical-systems/attractor/2";
import AttractorSequenceThree from "@/components/dynamical-systems/attractor/3";
import {
  attractorExperiments,
  isAttractorExperimentSlug,
} from "@/components/dynamical-systems/attractor/experiments";

export function generateStaticParams() {
  return attractorExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  const isTangentVariant = experiment === "3";
  const isWebglVariant = experiment === "2";
  return {
    title: `attractor/${isTangentVariant ? "3" : isWebglVariant ? "2" : "1"}`,
    description: isTangentVariant
      ? "A tangent-dynamics phase-space study of finite-time local divergence in six independently integrated strange-attractor trajectories."
      : isWebglVariant
      ? "A WebGL phase-space rendering of six independently integrated strange-attractor trajectories, with separately integrated sphere states."
      : "A six-part field of independently integrated finance, Dadras, Bouali, Aizawa, Nosé–Hoover, and Thomas trajectories.",
  };
}

export default async function AttractorExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isAttractorExperimentSlug(experiment)) notFound();
  if (experiment === "3") return <AttractorSequenceThree />;
  return experiment === "2" ? <AttractorSequenceTwo /> : <AttractorSequenceOne />;
}
