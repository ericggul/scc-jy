import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import MycorrhizalWaveOne from "@/components/complex-systems/mycorrhizal-wave/1";
import MycorrhizalWaveTwo from "@/components/complex-systems/mycorrhizal-wave/2";
import {
  isMycorrhizalWaveExperimentSlug,
  mycorrhizalWaveExperiments,
  type MycorrhizalWaveExperimentSlug,
} from "@/components/complex-systems/mycorrhizal-wave/experiments";

const components: Record<MycorrhizalWaveExperimentSlug, ComponentType> = {
  "1": MycorrhizalWaveOne,
  "2": MycorrhizalWaveTwo,
};

export function generateStaticParams() {
  return mycorrhizalWaveExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `mycorrhizal wave ${experiment}`,
    description: "Observed arbuscular-mycorrhizal network growth over laboratory time.",
  };
}

export default async function MycorrhizalWaveExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isMycorrhizalWaveExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
