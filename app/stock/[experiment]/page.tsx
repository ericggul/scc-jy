import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import StockOne from "@/components/stock/1";
import StockTwo from "@/components/stock/2";
import StockThree from "@/components/stock/3";
import StockFour from "@/components/stock/4";
import StockFive from "@/components/stock/5";
import {
  isStockExperimentSlug,
  stockExperiments,
  type StockExperimentSlug,
} from "@/components/stock/experiments";

const components: Record<StockExperimentSlug, ComponentType> = {
  "1": StockOne,
  "2": StockTwo,
  "3": StockThree,
  "4": StockFour,
  "5": StockFive,
};

export function generateStaticParams() {
  return stockExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export default async function StockExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isStockExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}

