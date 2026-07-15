import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import TranslateOne from "@/components/standalone/translate/1/TranslateGridExperiment";
import {
  isTranslateExperimentSlug,
  translateExperiments,
  type TranslateExperimentSlug,
} from "@/components/standalone/translate/experiments";

const components: Record<TranslateExperimentSlug, ComponentType> = {
  "1": TranslateOne,
};

export function generateStaticParams() {
  return translateExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `translate ${experiment}`,
  };
}

export default async function TranslateExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isTranslateExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
