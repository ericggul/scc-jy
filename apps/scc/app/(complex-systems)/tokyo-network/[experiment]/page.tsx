import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TokyoNetworkOne from "@/components/complex-systems/tokyo-network/1";
import {
  isTokyoNetworkExperimentSlug,
  tokyoNetworkExperiments,
} from "@/components/complex-systems/tokyo-network/experiments";

export function generateStaticParams() {
  return tokyoNetworkExperiments.map((experiment) => ({
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
    title: "complex-systems",
    description:
      "An adaptive network appearing and disappearing across a Tokyo road map.",
  };
}

export default async function TokyoNetworkExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isTokyoNetworkExperimentSlug(experiment)) notFound();
  return <TokyoNetworkOne />;
}
