import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import LanguageOne from "@/components/language/1";
import {
  isLanguageExperimentSlug,
  languageExperiments,
  type LanguageExperimentSlug,
} from "@/components/language/experiments";

const components: Record<LanguageExperimentSlug, ComponentType> = {
  "1": LanguageOne,
};

export function generateStaticParams() {
  return languageExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export default async function LanguageExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isLanguageExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
