import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import FingerSkatingOneMobile from "@/components/finger-skating/1/mobile";
import FingerSkatingTwoMobile from "@/components/finger-skating/2/mobile";
import {
  fingerSkatingExperiments,
  isFingerSkatingExperimentSlug,
  type FingerSkatingExperimentSlug,
} from "@/components/finger-skating/experiments";

const components: Record<FingerSkatingExperimentSlug, ComponentType> = {
  "1": FingerSkatingOneMobile,
  "2": FingerSkatingTwoMobile,
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

export default async function FingerSkatingMobilePage({
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
