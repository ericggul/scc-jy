import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NormalDistributionOne from "@/components/statistical-modelling/normal-distribution/1";
import NormalDistributionTwo from "@/components/statistical-modelling/normal-distribution/2";
import NormalDistributionThree from "@/components/statistical-modelling/normal-distribution/3";
import NormalDistributionFour from "@/components/statistical-modelling/normal-distribution/4";
import NormalDistributionFive from "@/components/statistical-modelling/normal-distribution/5";
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
    "3": "Independent three-dimensional random walks whose endpoint cloud approaches a trivariate normal distribution.",
    "4": "Four hundred connected normal-density mountains form a continuous terrain across a twenty-by-twenty plane.",
    "5": "Four hundred nested normal-density mountains form a circular spiral with a larger normal-distribution envelope.",
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
  if (experiment === "1") return <NormalDistributionOne />;
  if (experiment === "2") return <NormalDistributionTwo />;
  if (experiment === "3") return <NormalDistributionThree />;
  if (experiment === "4") return <NormalDistributionFour />;
  return <NormalDistributionFive />;
}
