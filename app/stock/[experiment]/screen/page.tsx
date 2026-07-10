import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StockOneScreen from "@/components/stock/1/screen";
import { isStockMultiDeviceExperimentSlug } from "@/components/stock/experiments";

export const metadata: Metadata = { title: "stock screen" };

export default async function StockScreenAliasPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isStockMultiDeviceExperimentSlug(experiment)) notFound();
  return <StockOneScreen />;
}
