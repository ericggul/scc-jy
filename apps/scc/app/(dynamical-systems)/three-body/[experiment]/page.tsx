import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ThreeBodyTwo from "@/components/dynamical-systems/three-body/2";
import ThreeBodyOne from "@/components/dynamical-systems/three-body/1";
import {
  isThreeBodyExperimentSlug,
  threeBodyExperiments,
} from "@/components/dynamical-systems/three-body/experiments";

export function generateStaticParams() {
  return threeBodyExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  if (!isThreeBodyExperimentSlug(experiment)) notFound();
  return {
    title: `three-body/${experiment}`,
    description: experiment === "2"
      ? "An adjustable twenty-body softened gravitational system with visible trajectories and computation."
      : "A numerical visualization of Burrau's Pythagorean Newtonian three-body initial-value problem.",
  };
}

export default async function ThreeBodyExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isThreeBodyExperimentSlug(experiment)) notFound();
  return experiment === "2" ? <ThreeBodyTwo /> : <ThreeBodyOne />;
}
