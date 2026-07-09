import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import StockOne from "@/components/stock/test/1";
import StockTwo from "@/components/stock/test/2";
import StockThree from "@/components/stock/test/3";
import StockFour from "@/components/stock/test/4";
import StockFive from "@/components/stock/test/5";
import {
  isStockExperimentSlug,
  stockExperiments,
  type StockExperimentSlug,
} from "@/components/stock/test/experiments";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `stock test ${experiment}`,
  };
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
