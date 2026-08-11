import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DdongMeongThreeBackgroundLab from "@/components/ddong-meong/3/testing/interactive-background-lab";
import {
  backgroundExperiments as threeBackgroundExperiments,
  findBackgroundExperiment as findThreeBackgroundExperiment,
} from "@/components/ddong-meong/3/testing/interactive-background-lab/registry";
import DdongMeongFourBackgroundLab from "@/components/ddong-meong/4/testing/interactive-background-lab";
import {
  backgroundExperiments as fourBackgroundExperiments,
  findBackgroundExperiment as findFourBackgroundExperiment,
} from "@/components/ddong-meong/4/testing/interactive-background-lab/registry";

export function generateStaticParams() {
  return [
    ...threeBackgroundExperiments.map((experiment) => ({
      experiment: "3",
      visual: experiment.slug,
    })),
    ...fourBackgroundExperiments.map((experiment) => ({
      experiment: "4",
      visual: experiment.slug,
    })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string; visual: string }>;
}): Promise<Metadata> {
  const { experiment, visual } = await params;
  const backgroundExperiment =
    experiment === "3"
      ? findThreeBackgroundExperiment(visual)
      : experiment === "4"
        ? findFourBackgroundExperiment(visual)
        : undefined;

  if (!backgroundExperiment) {
    return {};
  }

  return {
    title: `${backgroundExperiment.label} — ddong-meong ${experiment}`,
    description: `ddong-meong ${experiment} 인터랙티브 배경 실험`,
  };
}

export default async function DdongMeongBackgroundTestingPage({
  params,
}: {
  params: Promise<{ experiment: string; visual: string }>;
}) {
  const { experiment, visual } = await params;
  const threeBackgroundExperiment =
    experiment === "3" ? findThreeBackgroundExperiment(visual) : undefined;
  const fourBackgroundExperiment =
    experiment === "4" ? findFourBackgroundExperiment(visual) : undefined;

  if (!threeBackgroundExperiment && !fourBackgroundExperiment) {
    notFound();
  }

  if (threeBackgroundExperiment) {
    return (
      <DdongMeongThreeBackgroundLab
        experiment={threeBackgroundExperiment}
        key={threeBackgroundExperiment.slug}
      />
    );
  }

  return (
    <DdongMeongFourBackgroundLab
      experiment={fourBackgroundExperiment!}
      key={fourBackgroundExperiment!.slug}
    />
  );
}
