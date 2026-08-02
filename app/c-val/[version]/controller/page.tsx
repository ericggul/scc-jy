import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CValOneController from "@/components/c-val/1/controller";
import CValTwoController from "@/components/c-val/2/controller";
import {
  cValExperiments,
  isCValVersion,
  type CValVersion,
} from "@/components/c-val/experiments";

const controllers: Record<CValVersion, ComponentType> = {
  "1": CValOneController,
  "2": CValTwoController,
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
  return { title: `c-val ${version} controller` };
}

export default async function CValControllerPage({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;
  if (!isCValVersion(version)) notFound();
  const Controller = controllers[version];
  return <Controller />;
}
