import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

export const metadata: Metadata = {
  title: "three-body/1",
  description:
    "A numerical visualization of Burrau's Pythagorean Newtonian three-body initial-value problem.",
};

export default async function ThreeBodyExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isThreeBodyExperimentSlug(experiment)) notFound();
  return <ThreeBodyOne />;
}
