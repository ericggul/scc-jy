import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValOneMobileV3 from "@/components/c-val/1/mobile/v3";
import CValTwoMobileV3 from "@/components/c-val/2/mobile/v3";
import { isCValVersion } from "@/components/c-val/experiments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string }>;
}): Promise<Metadata> {
  const { version } = await params;
  return { title: `c-val ${version} mobile v3` };
}

export default async function CValMobileV3Page({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!isCValVersion(version)) notFound();
  return version === "1" ? <CValOneMobileV3 /> : <CValTwoMobileV3 />;
}
