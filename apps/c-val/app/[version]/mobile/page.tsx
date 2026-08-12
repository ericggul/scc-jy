import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CValOneMobile from "@/components/1/mobile";
import CValTwoMobile from "@/components/2/mobile";
import {
  cValExperiments,
  isCValVersion,
  type CValVersion,
} from "@/components/experiments";

const mobiles: Record<CValVersion, ComponentType> = {
  "1": CValOneMobile,
  "2": CValTwoMobile,
};

export function generateStaticParams() {
  return cValExperiments.map(({ version }) => ({ version }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string }>;
}): Promise<Metadata> {
  const { version } = await params;
  return { title: `c-val ${version} mobile` };
}

export default async function CValMobilePage({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!isCValVersion(version)) notFound();
  const Mobile = mobiles[version];
  return <Mobile />;
}
