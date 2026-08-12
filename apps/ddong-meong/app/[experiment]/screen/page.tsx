import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DdongMeongOneScreen from "@/components/1/screen";
import DdongMeongTwoScreen from "@/components/2/screen";
import DdongMeongThreeScreen from "@/components/3/screen";
import DdongMeongFourScreen from "@/components/4/screen";
import {
  ddongMeongExperiments,
  isDdongMeongExperimentSlug,
  type DdongMeongExperimentSlug,
} from "@/components/experiments";

const screenByExperiment = {
  "1": DdongMeongOneScreen,
  "2": DdongMeongTwoScreen,
  "3": DdongMeongThreeScreen,
  "4": DdongMeongFourScreen,
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

  if (experiment === "3" || experiment === "4") {
    return { title: "똥멍: 대시보드" };
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
