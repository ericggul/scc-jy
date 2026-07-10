import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import StockOneScreen from "@/components/stock/1/screen";
import StockTwo from "@/components/stock/2";
import StockDefault from "@/components/stock/default";
import {
  isStockDirectRoute,
  stockDirectRoutes,
  type StockDirectRoute,
} from "@/components/stock/experiments";

const components: Record<StockDirectRoute, ComponentType> = {
  default: StockDefault,
  "1": StockOneScreen,
  "2": StockTwo,
};

export function generateStaticParams() {
  return stockDirectRoutes.map((experiment) => ({ experiment }));
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

  if (!isStockDirectRoute(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
