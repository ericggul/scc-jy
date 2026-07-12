import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NetworkSystemController from "@/components/network-system/1/controller";
import MarkovController from "@/components/network-system/default/controller";
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
  return <NetworkSystemController />;
}
