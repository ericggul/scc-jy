import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValOneMobileV2 from "@/components/c-val/1/mobile/v2";
import CValTwoMobileV2 from "@/components/c-val/2/mobile/v2";
import { isCValVersion } from "@/components/c-val/experiments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string }>;
}): Promise<Metadata> {
  const { version } = await params;
  return { title: `c-val ${version} mobile v2` };
}

export default async function CValMobileV2Page({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!isCValVersion(version)) notFound();
  return version === "1" ? <CValOneMobileV2 /> : <CValTwoMobileV2 />;
}
