import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InteractiveBackgroundLab from "@/components/ddong-meong/3/testing/interactive-background-lab";
import {
  backgroundExperiments,
  findBackgroundExperiment,
} from "@/components/ddong-meong/3/testing/interactive-background-lab/registry";

export function generateStaticParams() {
  return backgroundExperiments.map((experiment) => ({
    experiment: "3",
    visual: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string; visual: string }>;
}): Promise<Metadata> {
  const { experiment, visual } = await params;
  const backgroundExperiment = findBackgroundExperiment(visual);

  if (experiment !== "3" || !backgroundExperiment) {
    return {};
  }

  return {
    title: `${backgroundExperiment.label} — ddong-meong 3`,
    description: "ddong-meong 3 인터랙티브 배경 실험",
  };
}

export default async function DdongMeongBackgroundTestingPage({
  params,
}: {
  params: Promise<{ experiment: string; visual: string }>;
}) {
  const { experiment, visual } = await params;
  const backgroundExperiment = findBackgroundExperiment(visual);

  if (experiment !== "3" || !backgroundExperiment) {
    notFound();
  }

  return (
    <InteractiveBackgroundLab
      experiment={backgroundExperiment}
      key={backgroundExperiment.slug}
    />
  );
}
