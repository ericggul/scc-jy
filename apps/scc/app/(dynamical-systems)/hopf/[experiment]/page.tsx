import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HopfOne from "@/components/dynamical-systems/hopf/1";
import {
  hopfExperiments,
  isHopfExperimentSlug,
} from "@/components/dynamical-systems/hopf/experiments";

export function generateStaticParams() {
  return hopfExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "hopf/1",
  description:
    "An interactive supercritical Hopf normal-form phase plane with an editable bifurcation parameter.",
};

export default async function HopfExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isHopfExperimentSlug(experiment)) notFound();
  return <HopfOne />;
}
