import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CircularOwnershipOne from "@/components/complex-systems/circular-ownership/1";
import {
  circularOwnershipExperiments,
  isCircularOwnershipExperimentSlug,
} from "@/components/complex-systems/circular-ownership/experiments";

export function generateStaticParams() {
  return circularOwnershipExperiments.map((experiment) => ({ experiment: experiment.slug }));
}

export const metadata: Metadata = {
  title: "circular-ownership/1",
  description: "A dynamic, fictional circular-ownership simulacrum built from a 63-company Samsung affiliate roster.",
};

export default async function CircularOwnershipExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isCircularOwnershipExperimentSlug(experiment)) notFound();
  return <CircularOwnershipOne />;
}
