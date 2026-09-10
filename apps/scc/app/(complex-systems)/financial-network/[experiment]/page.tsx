import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FinancialNetwork from "@/components/complex-systems/financial-network/1";
import FinancialNetworkTwo from "@/components/complex-systems/financial-network/2";
import {
  financialNetworkExperiments,
  isFinancialNetworkExperimentSlug,
} from "@/components/complex-systems/financial-network/experiments";

export function generateStaticParams() {
  return financialNetworkExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `financial-network/${experiment}`,
    description: experiment === "2"
      ? "A synthetic macro-financial payment network with rollover, collateral and threshold contagion."
      : "Payments, rollover and collateral in an interdependent economy.",
  };
}

export default async function FinancialNetworkPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isFinancialNetworkExperimentSlug(experiment)) notFound();
  if (experiment === "1") return <FinancialNetwork />;
  return <FinancialNetworkTwo />;
}
