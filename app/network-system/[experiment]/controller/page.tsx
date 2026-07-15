import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NetworkSystemController from "@/components/network-system/macro-economy/controller";
import MarkovController from "@/components/network-system/default/controller";
import PopulationController from "@/components/network-system/population/controller";
import CompetitiveFirmsController from "@/components/network-system/competitive-firms/controller";
import CycleController from "@/components/network-system/cycle/controller";
import {
  isNetworkSystemExperimentSlug,
  networkSystemExperiments,
} from "@/components/network-system/experiments";

export function generateStaticParams() {
  return networkSystemExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `network system controller ${experiment}` };
}

export default async function NetworkSystemControllerPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isNetworkSystemExperimentSlug(experiment)) notFound();
  if (experiment === "default") return <MarkovController />;
  if (experiment === "population") return <PopulationController />;
  if (experiment === "competitive-firms") return <CompetitiveFirmsController />;
  if (experiment === "cycle") return <CycleController />;
  return <NetworkSystemController />;
}
