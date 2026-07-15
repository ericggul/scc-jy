import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import BastilleDayOne from "@/components/standalone/bastille-day/1";
import BastilleDayTwo from "@/components/standalone/bastille-day/2";
import {
  bastilleDayExperiments,
  isBastilleDayExperimentSlug,
  type BastilleDayExperimentSlug,
} from "@/components/standalone/bastille-day/experiments";

const components: Record<BastilleDayExperimentSlug, ComponentType> = {
  "1": BastilleDayOne,
  "2": BastilleDayTwo,
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
    description: "Rapid full-screen image sequences around French national identity and social tension.",
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
