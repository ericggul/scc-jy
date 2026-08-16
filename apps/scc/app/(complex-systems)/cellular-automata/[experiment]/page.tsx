import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CellularAutomataOne from "@/components/complex-systems/cellular-automata/1";
import CellularAutomataTwo from "@/components/complex-systems/cellular-automata/2";
import CellularAutomataThree from "@/components/complex-systems/cellular-automata/3";
import CellularAutomataFour from "@/components/complex-systems/cellular-automata/4";
import CellularAutomataFive from "@/components/complex-systems/cellular-automata/5";
import CellularAutomataSix from "@/components/complex-systems/cellular-automata/6";
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
    description: experiment === "6"
      ? "Independent cellular automata rendered as nested hexagons and circles."
      : experiment === "5"
      ? "Five independent B3/S23 automata rendered as nested squares and circles."
      : experiment === "4"
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
  if (experiment === "5") return <CellularAutomataFive />;
  if (experiment === "6") return <CellularAutomataSix />;
  return <CellularAutomataOne />;
}
