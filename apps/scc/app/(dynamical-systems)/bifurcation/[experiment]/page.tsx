import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BifurcationOne from "@/components/dynamical-systems/bifurcation/1";
import {
  bifurcationExperiments,
  isBifurcationExperimentSlug,
} from "@/components/dynamical-systems/bifurcation/experiments";

export function generateStaticParams() {
  return bifurcationExperiments.map(({ slug: experiment }) => ({ experiment }));
}

export const metadata: Metadata = {
  title: "bifurcation/1",
  description:
    "A GPU particle rendering of the logistic-map period-doubling bifurcation.",
};

export default async function BifurcationExperimentPage({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>) {
  const { experiment } = await params;
  if (!isBifurcationExperimentSlug(experiment)) notFound();
  return <BifurcationOne />;
}
