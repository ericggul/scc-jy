import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TerminalOne from "@/components/complex-systems/terminal/1";
import {
  isTerminalExperimentSlug,
  terminalExperiments,
} from "@/components/complex-systems/terminal/experiments";

export function generateStaticParams() {
  return terminalExperiments.map((experiment) => ({
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
      "A colony of local terminal agents that writes, signals, and forks without a central controller.",
  };
}

export default async function TerminalExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isTerminalExperimentSlug(experiment)) notFound();
  return <TerminalOne />;
}
