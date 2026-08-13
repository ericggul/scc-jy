import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AntColonyOne from "@/components/complex-systems/ant-colony/1";
import {
  antColonyExperiments,
  isAntColonyExperimentSlug,
} from "@/components/complex-systems/ant-colony/experiments";

export function generateStaticParams() {
  return antColonyExperiments.map((experiment) => ({
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
    title: `ant colony ${experiment}`,
    description:
      "A self-replicating colony whose agents follow local nutrients and traces.",
  };
}

export default async function AntColonyExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isAntColonyExperimentSlug(experiment)) notFound();
  return <AntColonyOne />;
}
