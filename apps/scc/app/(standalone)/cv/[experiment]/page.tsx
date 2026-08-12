import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CvOne from "@/components/standalone/cv/1";
import CvTwo from "@/components/standalone/cv/2";
import CvThree from "@/components/standalone/cv/3";
import {
  cvExperiments,
  isCvExperimentSlug,
  type CvExperimentSlug,
} from "@/components/standalone/cv/experiments";

const components: Record<CvExperimentSlug, ComponentType> = {
  "1": CvOne,
  "2": CvTwo,
  "3": CvThree,
};

export function generateStaticParams() {
  return cvExperiments.map((experiment) => ({
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
    title: `cv ${experiment}`,
  };
}

export default async function CvExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isCvExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
