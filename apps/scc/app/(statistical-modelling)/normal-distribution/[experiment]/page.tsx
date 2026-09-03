import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NormalDistributionOne from "@/components/statistical-modelling/normal-distribution/1";
import NormalDistributionTwo from "@/components/statistical-modelling/normal-distribution/2";
import {
  isNormalDistributionExperimentSlug,
  normalDistributionExperiments,
} from "@/components/statistical-modelling/normal-distribution/experiments";

export function generateStaticParams() {
  return normalDistributionExperiments.map(({ slug: experiment }) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>): Promise<Metadata> {
  const { experiment } = await params;
  const descriptions = {
    "1": "A static, directly orbitable bivariate normal-density surface made from particles.",
    "2": "A finite central-limit sampling trial that gathers into a stochastic particle field.",
  } as const;

  return {
    title: `normal-distribution/${experiment}`,
    description: isNormalDistributionExperimentSlug(experiment)
      ? descriptions[experiment]
      : "A statistical-modelling experiment.",
  };
}

export default async function NormalDistributionExperimentPage({
  params,
}: Readonly<{
  params: Promise<{ experiment: string }>;
}>) {
  const { experiment } = await params;
  if (!isNormalDistributionExperimentSlug(experiment)) notFound();
  return experiment === "1" ? <NormalDistributionOne /> : <NormalDistributionTwo />;
}
