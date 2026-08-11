import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValMobileV3 from "@/components/c-val/2/mobile/v3";

export const metadata: Metadata = {
  title: "c-val 2 mobile v3",
};

export default async function CValMobileV3Page({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (version !== "2") notFound();
  return <CValMobileV3 />;
}
