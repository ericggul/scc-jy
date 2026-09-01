import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FingerSkatingDefaultOneScreen from "@/components/finger-skating/default/1/screen";
import FingerSkatingDefaultTwoScreen from "@/components/finger-skating/default/2/screen";
import FingerSkatingFieldOneScreen from "@/components/finger-skating/field/1/screen";
import {
  fingerSkatingGroups,
  isFingerSkatingGroupSlug,
  isFingerSkatingExperimentSlug,
} from "@/components/finger-skating/experiments";

export function generateStaticParams() {
  return fingerSkatingGroups.flatMap((group) =>
    group.experiments.map((experiment) => ({
      group: group.slug,
      experiment: experiment.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ group: string; experiment: string }>;
}): Promise<Metadata> {
  const { group, experiment } = await params;
  return {
    title: `finger-skating/${group}/${experiment}/screen`,
  };
}

export default async function FingerSkatingScreenPage({
  params,
}: {
  params: Promise<{ group: string; experiment: string }>;
}) {
  const { group, experiment } = await params;

  if (
    !isFingerSkatingGroupSlug(group) ||
    !isFingerSkatingExperimentSlug(group, experiment)
  ) {
    notFound();
  }

  if (group === "default" && experiment === "1") {
    return <FingerSkatingDefaultOneScreen />;
  }
  if (group === "default" && experiment === "2") {
    return <FingerSkatingDefaultTwoScreen />;
  }
  if (group === "field" && experiment === "1") {
    return <FingerSkatingFieldOneScreen />;
  }
  notFound();
}
