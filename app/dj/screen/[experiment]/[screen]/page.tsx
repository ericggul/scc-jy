import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjScreen, { DjScreenExperience } from "@/components/dj/1/screen";
import {
  djExperiments,
  djScreenIds,
  isDjExperimentSlug,
  isDjScreenId,
  isDjScreenRoute,
} from "@/components/dj/experiments";

export function generateStaticParams() {
  return djExperiments.flatMap((experiment) =>
    [...djScreenIds, "whole"].map((screen) => ({
      experiment: experiment.slug,
      screen,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string; screen: string }>;
}): Promise<Metadata> {
  const { experiment, screen } = await params;
  return {
    title: `dj ${experiment} screen ${screen}`,
  };
}

export default async function DjScreenPage({
  params,
}: {
  params: Promise<{ experiment: string; screen: string }>;
}) {
  const { experiment, screen } = await params;

  if (!isDjExperimentSlug(experiment) || !isDjScreenRoute(screen)) {
    notFound();
  }

  if (screen === "whole") {
    return <DjScreenExperience screenIds={djScreenIds} />;
  }

  if (!isDjScreenId(screen)) {
    notFound();
  }

  return <DjScreen screenId={screen} />;
}
