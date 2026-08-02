import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DdongMeongOneMain from "@/components/ddong-meong/1/main";
import DdongMeongTwoMain from "@/components/ddong-meong/2/main";
import {
  ddongMeongExperiments,
  isDdongMeongExperimentSlug,
  type DdongMeongExperimentSlug,
} from "@/components/ddong-meong/experiments";

const mainByExperiment = {
  "1": DdongMeongOneMain,
  "2": DdongMeongTwoMain,
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
    title: `ddong-meong ${experiment} — 명상 콘텐츠`,
    description: "4분 33초 동안 몸의 감각과 호흡에 집중하는 명상.",
  };
}

export default async function DdongMeongMainPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isDdongMeongExperimentSlug(experiment)) {
    notFound();
  }

  const ExperimentMain = mainByExperiment[experiment];
  return <ExperimentMain />;
}
