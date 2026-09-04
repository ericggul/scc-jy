import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CellularAutomataOne from "@/components/complex-systems/cellular-automata/colour/1";
import CellularAutomataTwo from "@/components/complex-systems/cellular-automata/colour/2";
import CellularAutomataThree from "@/components/complex-systems/cellular-automata/colour/3";
import CellularAutomataFour from "@/components/complex-systems/cellular-automata/colour/4";
import CellularAutomataFive from "@/components/complex-systems/cellular-automata/colour/5";
import CellularAutomataSix from "@/components/complex-systems/cellular-automata/colour/6";
import GridNetworkOne from "@/components/complex-systems/cellular-automata/grid-network/1";
import GridNetworkTwo from "@/components/complex-systems/cellular-automata/grid-network/2";
import GridNetworkThree from "@/components/complex-systems/cellular-automata/grid-network/3";
import {
  cellularAutomataExperiments,
  getCellularAutomataExperiment,
} from "@/components/complex-systems/cellular-automata/experiments";

export function generateStaticParams() {
  return cellularAutomataExperiments.map((experiment) => ({
    family: experiment.family,
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ family: string; experiment: string }>;
}): Promise<Metadata> {
  const { family, experiment } = await params;
  const currentExperiment = getCellularAutomataExperiment(family, experiment);

  return {
    title: "complex-systems",
    description: currentExperiment?.family === "grid-network"
      ? currentExperiment.slug === "3"
        ? "An 8 by 8 by 8 black and white cellular volume with independent face-adjacent and edge-diagonal automata."
        : currentExperiment.slug === "2"
          ? "A 48 by 48 red, green, and blue grid with independent cardinal and diagonal cellular automata."
          : "A 24 by 24 cellular grid with cardinal background and diagonal border automata."
      : currentExperiment
        ? "A cellular automata colour experiment."
        : undefined,
  };
}

export default async function CellularAutomataExperimentPage({
  params,
}: {
  params: Promise<{ family: string; experiment: string }>;
}) {
  const { family, experiment } = await params;
  const currentExperiment = getCellularAutomataExperiment(family, experiment);
  if (!currentExperiment) notFound();

  if (currentExperiment.family === "grid-network") {
    if (currentExperiment.slug === "3") return <GridNetworkThree />;
    if (currentExperiment.slug === "2") return <GridNetworkTwo />;
    return <GridNetworkOne />;
  }
  if (currentExperiment.slug === "2") return <CellularAutomataTwo />;
  if (currentExperiment.slug === "3") return <CellularAutomataThree />;
  if (currentExperiment.slug === "4") return <CellularAutomataFour />;
  if (currentExperiment.slug === "5") return <CellularAutomataFive />;
  if (currentExperiment.slug === "6") return <CellularAutomataSix />;
  return <CellularAutomataOne />;
}
