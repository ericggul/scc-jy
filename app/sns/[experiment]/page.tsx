import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import SnsOne from "@/components/sns/1";
import {
  isSnsExperimentSlug,
  snsExperiments,
  type SnsExperimentSlug,
} from "@/components/sns/experiments";

const components: Record<SnsExperimentSlug, ComponentType> = {
  "1": SnsOne,
};

export function generateStaticParams() {
  return snsExperiments.map((experiment) => ({
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
    title: `sns ${experiment}`,
  };
}

export default async function SnsExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isSnsExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
