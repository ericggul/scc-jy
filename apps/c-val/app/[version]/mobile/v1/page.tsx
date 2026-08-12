import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValOneMobile from "@/components/1/mobile";
import CValTwoMobile from "@/components/2/mobile";
import { isCValVersion } from "@/components/experiments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string }>;
}): Promise<Metadata> {
  const { version } = await params;
  return { title: `c-val ${version} mobile v1` };
}

export default async function CValMobileV1Page({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!isCValVersion(version)) notFound();
  return version === "1" ? <CValOneMobile /> : <CValTwoMobile interfaceVersion="v1" />;
}
