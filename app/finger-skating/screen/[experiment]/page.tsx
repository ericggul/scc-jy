import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import FingerSkatingOneScreen from "@/components/finger-skating/1/screen";
import {
  fingerSkatingExperiments,
  isFingerSkatingExperimentSlug,
  type FingerSkatingExperimentSlug,
} from "@/components/finger-skating/experiments";

const components: Record<FingerSkatingExperimentSlug, ComponentType> = {
  "1": FingerSkatingOneScreen,
};

export function generateStaticParams() {
  return fingerSkatingExperiments.map((experiment) => ({
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
    title: `finger-skating ${experiment}`,
  };
}

export default async function FingerSkatingScreenPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isFingerSkatingExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
