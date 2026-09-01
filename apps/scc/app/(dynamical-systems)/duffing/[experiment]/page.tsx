import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DuffingOne from "@/components/dynamical-systems/duffing/1";
import {
  duffingExperiments,
  isDuffingExperimentSlug,
} from "@/components/dynamical-systems/duffing/experiments";

export function generateStaticParams() {
  return duffingExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export const metadata: Metadata = {
  title: "duffing/1",
  description:
    "An editable visualization of a driven, damped double-well Duffing oscillator.",
};

export default async function DuffingExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isDuffingExperimentSlug(experiment)) notFound();
  return <DuffingOne />;
}
