import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarkovChainOne from "@/components/complex-systems/markov-chain/1";
import {
  isMarkovChainExperimentSlug,
  markovChainExperiments,
} from "@/components/complex-systems/markov-chain/experiments";

export function generateStaticParams() {
  return markovChainExperiments.map((experiment) => ({
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
    title: `markov chain ${experiment}`,
    description:
      "A non-reversible Markov chain over site, movement tendency, and regime.",
  };
}

export default async function MarkovChainExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isMarkovChainExperimentSlug(experiment)) notFound();
  return <MarkovChainOne />;
}
