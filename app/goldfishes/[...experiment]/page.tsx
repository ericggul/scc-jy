import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  findGoldfishExperiment,
  goldfishExperiments,
} from "@/components/goldfishes/experiments";

export const dynamicParams = false;

export function generateStaticParams() {
  return goldfishExperiments.map((experiment) => ({
    experiment: experiment.key.split("/"),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}): Promise<Metadata> {
  const { experiment: path } = await params;
  const experiment = findGoldfishExperiment(path);

  if (!experiment) return { title: "goldfishes" };

  return {
    title: `goldfishes ${experiment.key}`,
    description: experiment.phrase,
  };
}

export default async function GoldfishesExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;
  const experiment = findGoldfishExperiment(path);

  if (!experiment) notFound();

  const { default: Component } = await experiment.load();
  return <Component />;
}
