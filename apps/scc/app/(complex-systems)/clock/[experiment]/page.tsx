import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecursiveClockOne from "@/components/complex-systems/clock/1";
import {
  clockExperiments,
  isClockExperimentSlug,
} from "@/components/complex-systems/clock/experiments";

export function generateStaticParams() {
  return clockExperiments.map((experiment) => ({
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
    title: `clock/${experiment}`,
    description:
      "A deterministic tree of analogue clocks recursively attached to every hour, minute, and second hand.",
  };
}

export default async function ClockExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isClockExperimentSlug(experiment)) notFound();
  return <RecursiveClockOne />;
}
