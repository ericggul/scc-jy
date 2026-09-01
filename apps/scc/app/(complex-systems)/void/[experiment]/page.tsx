import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VoidOne from "@/components/complex-systems/void/1";
import VoidTwo from "@/components/complex-systems/void/2";
import VoidThree from "@/components/complex-systems/void/3";
import {
  isVoidExperimentSlug,
  voidExperiments,
} from "@/components/complex-systems/void/experiments";

export function generateStaticParams() {
  return voidExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  const isTerritoryField = experiment === "2";
  const isCouzinTorus = experiment === "3";
  return {
    title: `void/${experiment}`,
    description: isCouzinTorus
      ? "A 2D Couzin zonal-interaction flock whose local repulsion, orientation, and attraction open a moving low-density core."
      : isTerritoryField
        ? "A sparse field of curved concentric territories, continuously negotiated between circular influence and Voronoi boundaries."
        : "A high-density weighted Vicsek field where local coupling visibly makes and unmakes voids.",
  };
}

export default async function VoidExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isVoidExperimentSlug(experiment)) notFound();
  if (experiment === "2") return <VoidTwo />;
  if (experiment === "3") return <VoidThree />;
  return <VoidOne />;
}
