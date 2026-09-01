import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FingerSkatingDefaultOneMobile from "@/components/finger-skating/default/1/mobile";
import FingerSkatingDefaultTwoMobile from "@/components/finger-skating/default/2/mobile";
import FingerSkatingFieldOneMobile from "@/components/finger-skating/field/1/mobile";
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
    title: `finger-skating/${group}/${experiment}/mobile`,
  };
}

export default async function FingerSkatingMobilePage({
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
    return <FingerSkatingDefaultOneMobile />;
  }
  if (group === "default" && experiment === "2") {
    return <FingerSkatingDefaultTwoMobile />;
  }
  if (group === "field" && experiment === "1") {
    return <FingerSkatingFieldOneMobile />;
  }
  notFound();
}
