import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CellularAutomataOne from "@/components/complex-systems/cellular-automata/1";
import CellularAutomataTwo from "@/components/complex-systems/cellular-automata/2";
import CellularAutomataThree from "@/components/complex-systems/cellular-automata/3";
import CellularAutomataFour from "@/components/complex-systems/cellular-automata/4";
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
    description: experiment === "4"
      ? "Two independently transmitting RGB cellular automata: colour fields and colour words."
      : experiment === "3"
      ? "A directly editable three-state probabilistic transmission automaton."
      : experiment === "2"
      ? "A directly editable three-state cyclic cellular automaton."
      : "A directly editable B3/S23 cellular automaton.",
  };
}

export default async function CellularAutomataExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isCellularAutomataExperimentSlug(experiment)) notFound();
  if (experiment === "2") return <CellularAutomataTwo />;
  if (experiment === "3") return <CellularAutomataThree />;
  if (experiment === "4") return <CellularAutomataFour />;
  return <CellularAutomataOne />;
}
