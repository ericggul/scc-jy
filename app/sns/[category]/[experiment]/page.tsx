import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SnsFeedOne from "@/components/sns/feed/1";
import SnsNavigationOne from "@/components/sns/navigation/1";
import SnsNavigationDefault from "@/components/sns/navigation/default";
import {
  findSnsExperiment,
  snsExperiments,
  type SnsExperimentKey,
} from "@/components/sns/experiments";

const components: Record<SnsExperimentKey, ComponentType> = {
  "feed/1": SnsFeedOne,
  "navigation/default": SnsNavigationDefault,
  "navigation/1": SnsNavigationOne,
};

export function generateStaticParams() {
  return snsExperiments.map(({ category, slug }) => ({
    category,
    experiment: slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; experiment: string }>;
}): Promise<Metadata> {
  const { category, experiment } = await params;
  return {
    title: `sns ${category} ${experiment}`,
  };
}

export default async function SnsExperimentPage({
  params,
}: {
  params: Promise<{ category: string; experiment: string }>;
}) {
  const { category, experiment } = await params;
  const registeredExperiment = findSnsExperiment(category, experiment);

  if (!registeredExperiment) {
    notFound();
  }

  const Component = components[registeredExperiment.key];
  return <Component />;
}
