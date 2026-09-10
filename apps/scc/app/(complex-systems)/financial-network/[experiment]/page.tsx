import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FinancialNetwork from "@/components/complex-systems/financial-network/1";
import FinancialNetworkTwo from "@/components/complex-systems/financial-network/2";
import FinancialNetworkThree from "@/components/complex-systems/financial-network/3";
import FinancialNetworkFour from "@/components/complex-systems/financial-network/4";
import FinancialNetworkFive from "@/components/complex-systems/financial-network/5";
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
      : experiment === "3"
        ? "A colour-coded map of payment, claim and liquidity relations in an interdependent economy."
        : experiment === "4"
          ? "A live transaction field whose edges exist only while modeled payments move."
          : experiment === "5"
            ? "A live adaptive financial field with learned lending, precautionary saving, and rewired payment relations."
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
  if (experiment === "2") return <FinancialNetworkTwo />;
  if (experiment === "3") return <FinancialNetworkThree />;
  if (experiment === "4") return <FinancialNetworkFour />;
  return <FinancialNetworkFive />;
}
