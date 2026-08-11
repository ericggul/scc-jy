import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DdongMeongOneMobile from "@/components/ddong-meong/1/mobile";
import DdongMeongTwoMobile from "@/components/ddong-meong/2/mobile";
import DdongMeongThreeMobile from "@/components/ddong-meong/3/mobile";
import {
  ddongMeongExperiments,
  isDdongMeongExperimentSlug,
  type DdongMeongExperimentSlug,
} from "@/components/ddong-meong/experiments";

const mobileByExperiment = {
  "1": DdongMeongOneMobile,
  "2": DdongMeongTwoMobile,
  "3": DdongMeongThreeMobile,
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

  if (experiment === "3") {
    return {
      title: "똥멍",
      description: "A toilet-seat meditation for letting go.",
    };
  }

  return {
    title: `ddong-meong ${experiment}`,
    description: "A toilet-seat meditation for letting go.",
  };
}

export default async function DdongMeongExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isDdongMeongExperimentSlug(experiment)) {
    notFound();
  }

  const MobileExperience = mobileByExperiment[experiment];
  return <MobileExperience />;
}
