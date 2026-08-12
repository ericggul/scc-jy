import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StockOneMobile from "@/components/dashboard/stock/1/mobile";
import { isStockMultiDeviceExperimentSlug } from "@/components/dashboard/stock/experiments";

export const metadata: Metadata = { title: "stock mobile" };

export default async function StockMobilePage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isStockMultiDeviceExperimentSlug(experiment)) notFound();
  return <StockOneMobile />;
}
