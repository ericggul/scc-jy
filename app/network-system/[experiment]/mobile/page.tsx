import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValMobile from "@/components/network-system/c-val/mobile";

export function generateStaticParams() {
  return [{ experiment: "c-val" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `network system mobile ${experiment}` };
}

export default async function NetworkSystemMobilePage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (experiment !== "c-val") notFound();
  return <CValMobile />;
}
