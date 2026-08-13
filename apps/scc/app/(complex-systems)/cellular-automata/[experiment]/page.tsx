import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CellularAutomataOne from "@/components/complex-systems/cellular-automata/1";
import {
  cellularAutomataExperiments,
  isCellularAutomataExperimentSlug,
} from "@/components/complex-systems/cellular-automata/experiments";

export function generateStaticParams() {
  return cellularAutomataExperiments.map((experiment) => ({
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
    title: `cellular automata ${experiment}`,
    description: "A directly editable B3/S23 cellular automaton.",
  };
}

export default async function CellularAutomataExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isCellularAutomataExperimentSlug(experiment)) notFound();
  return <CellularAutomataOne />;
}
