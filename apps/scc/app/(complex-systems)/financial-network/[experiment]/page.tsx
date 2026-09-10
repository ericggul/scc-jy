import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FinancialNetwork from "@/components/complex-systems/financial-network/1";
import {
  financialNetworkExperiments,
  isFinancialNetworkExperimentSlug,
} from "@/components/complex-systems/financial-network/experiments";

export const metadata: Metadata = {
  title: "financial-network/1",
  description: "Payments, rollover and collateral in an interdependent economy.",
};

export function generateStaticParams() {
  return financialNetworkExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function FinancialNetworkPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isFinancialNetworkExperimentSlug(experiment)) notFound();
  return <FinancialNetwork />;
}
