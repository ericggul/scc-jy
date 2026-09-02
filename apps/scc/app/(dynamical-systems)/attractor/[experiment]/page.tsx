import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import AttractorSequenceOne from "@/components/dynamical-systems/attractor/1";
import AttractorSequenceTwo from "@/components/dynamical-systems/attractor/2";
import AttractorSequenceThree from "@/components/dynamical-systems/attractor/3";
import {
  attractorExperiments,
  isAttractorExperimentSlug,
} from "@/components/dynamical-systems/attractor/experiments";

const retiredAttractorExperimentSlugs = ["4"] as const;

export function generateStaticParams() {
  return [
    ...attractorExperiments.map((experiment) => experiment.slug),
    ...retiredAttractorExperimentSlugs,
  ].map((experiment) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  const canonicalExperiment = experiment === "4" ? "2" : experiment;
  const isTangentVariant = canonicalExperiment === "2";
  const isThomasParticleVariant = canonicalExperiment === "3";
  return {
    title: `attractor/${isTangentVariant ? "2" : isThomasParticleVariant ? "3" : "1"}`,
    description: isTangentVariant
      ? "A WebGPU and TSL renderer study of finite-time local divergence in seven tangent-dynamics attractor fields, with a WebGL fallback."
      : isThomasParticleVariant
      ? "A three-dimensional Thomas-attractor particle field with thirty thousand independently integrated states."
      : "A WebGL phase-space rendering of six independently integrated strange-attractor trajectories, with separately integrated sphere states.",
  };
}

export default async function AttractorExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment === "4") {
    permanentRedirect("/attractor/2");
  }
  if (!isAttractorExperimentSlug(experiment)) notFound();
  if (experiment === "3") return <AttractorSequenceThree />;
  return experiment === "2" ? <AttractorSequenceTwo /> : <AttractorSequenceOne />;
}
