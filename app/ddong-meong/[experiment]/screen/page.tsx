import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DdongMeongOneScreen from "@/components/ddong-meong/1/screen";
import DdongMeongTwoScreen from "@/components/ddong-meong/2/screen";
import {
  ddongMeongExperiments,
  isDdongMeongExperimentSlug,
  type DdongMeongExperimentSlug,
} from "@/components/ddong-meong/experiments";

const screenByExperiment = {
  "1": DdongMeongOneScreen,
  "2": DdongMeongTwoScreen,
} satisfies Record<DdongMeongExperimentSlug, ComponentType>;

export function generateStaticParams() {
  return ddongMeongExperiments.map(({ slug }) => ({
    experiment: slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;

  if (!isDdongMeongExperimentSlug(experiment)) {
    return {};
  }

  return {
    title: `ddong-meong ${experiment} screen`,
  };
}

export default async function DdongMeongExperimentScreenPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isDdongMeongExperimentSlug(experiment)) {
    notFound();
  }

  const ExperimentScreen = screenByExperiment[experiment];
  return <ExperimentScreen />;
}
