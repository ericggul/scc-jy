import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import MacosMenuBarOne from "@/components/macos/1";
import {
  isMacosExperimentSlug,
  macosExperiments,
  type MacosExperimentSlug,
} from "@/components/macos/experiments";

const components: Record<MacosExperimentSlug, ComponentType> = {
  "1": MacosMenuBarOne,
};

export function generateStaticParams() {
  return macosExperiments.map((experiment) => ({
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
    title: `macOS ${experiment}`,
  };
}

export default async function MacosExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isMacosExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
