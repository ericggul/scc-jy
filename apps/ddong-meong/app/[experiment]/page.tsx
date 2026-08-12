import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import DdongMeongOneMobile from "@/components/1/mobile";
import DdongMeongTwoMobile from "@/components/2/mobile";
import DdongMeongThreeMobile from "@/components/3/mobile";
import DdongMeongFourMobile from "@/components/4/mobile";
import { entryContextFromQuery } from "@/components/4/model/entry-context";
import {
  ddongMeongExperiments,
  isDdongMeongExperimentSlug,
  type DdongMeongExperimentSlug,
} from "@/components/experiments";

const mobileByExperiment = {
  "1": DdongMeongOneMobile,
  "2": DdongMeongTwoMobile,
  "3": DdongMeongThreeMobile,
  "4": DdongMeongFourMobile,
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

  if (experiment === "4") {
    return {
      title: "똥멍",
      description: "A deadpan toilet-seat meditation for taking a proper poop break.",
    };
  }

  return {
    title: `ddong-meong ${experiment}`,
    description: "A toilet-seat meditation for letting go.",
  };
}

export default async function DdongMeongExperimentPage({
  params,
  searchParams,
}: {
  params: Promise<{ experiment: string }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { experiment } = await params;

  if (!isDdongMeongExperimentSlug(experiment)) {
    notFound();
  }

  if (experiment === "4") {
    const entryContext = entryContextFromQuery(await searchParams);
    return <DdongMeongFourMobile entryContext={entryContext} />;
  }

  const MobileExperience = mobileByExperiment[experiment];
  return <MobileExperience />;
}
