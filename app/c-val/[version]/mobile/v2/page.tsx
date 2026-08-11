import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValMobileV2 from "@/components/c-val/2/mobile/v2";

export const metadata: Metadata = {
  title: "c-val 2 mobile v2",
};

export default async function CValMobileV2Page({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (version !== "2") notFound();
  return <CValMobileV2 />;
}
