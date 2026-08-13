import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArtificialLanguageOne from "@/components/complex-systems/artificial-language/1";
import {
  artificialLanguageExperiments,
  isArtificialLanguageExperimentSlug,
} from "@/components/complex-systems/artificial-language/experiments";

export function generateStaticParams() {
  return artificialLanguageExperiments.map((experiment) => ({
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
    title: `artificial language ${experiment}`,
    description: "A local social network where invented words copy, split, and converge.",
  };
}

export default async function ArtificialLanguageExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isArtificialLanguageExperimentSlug(experiment)) notFound();
  return <ArtificialLanguageOne />;
}
