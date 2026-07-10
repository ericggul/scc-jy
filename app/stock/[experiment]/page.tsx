import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import StockOne from "@/components/stock/1";
import {
  isStockExperimentSlug,
  stockExperiments,
  type StockExperimentSlug,
} from "@/components/stock/experiments";

const components: Record<StockExperimentSlug, ComponentType> = {
  "1": StockOne,
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
    title: `stock ${experiment}`,
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
