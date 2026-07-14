import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import BastilleDayOne from "@/components/bastille-day/1";
import {
  bastilleDayExperiments,
  isBastilleDayExperimentSlug,
  type BastilleDayExperimentSlug,
} from "@/components/bastille-day/experiments";

const components: Record<BastilleDayExperimentSlug, ComponentType> = {
  "1": BastilleDayOne,
};

export function generateStaticParams() {
  return bastilleDayExperiments.map((experiment) => ({
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
    title: `bastille-day ${experiment}`,
    description: "Thirty overlapping images across three French national-day search terms.",
  };
}

export default async function BastilleDayExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isBastilleDayExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
