import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjScreen, { DjScreenExperience } from "@/components/dj/1/screen";
import DjReactionScreen, {
  DjReactionScreenExperience,
} from "@/components/dj/2/screen";
import {
  djExperiments,
  getDjExperimentScreenIds,
  type DjExperimentSlug,
  type DjScreenId,
  isDjExperimentScreenRoute,
  isDjExperimentSlug,
  isDjScreenId,
} from "@/components/dj/experiments";

export function generateStaticParams() {
  return djExperiments.flatMap((experiment) =>
    [...experiment.screenIds, "whole"].map((screen) => ({
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

  if (
    !isDjExperimentSlug(experiment) ||
    !isDjExperimentScreenRoute(experiment, screen)
  ) {
    notFound();
  }

  const screenIds = getDjExperimentScreenIds(experiment);
  if (!screenIds) {
    notFound();
  }

  if (screen === "whole") {
    return getWholeComponent(experiment, screenIds);
  }

  if (!isDjScreenId(screen)) {
    notFound();
  }

  return getScreenComponent(experiment, screen);
}

function getWholeComponent(
  experiment: DjExperimentSlug,
  screenIds: readonly DjScreenId[],
) {
  if (experiment === "2") {
    return <DjReactionScreenExperience screenIds={screenIds} />;
  }

  return <DjScreenExperience screenIds={screenIds} />;
}

function getScreenComponent(experiment: DjExperimentSlug, screenId: DjScreenId) {
  if (experiment === "2") {
    return <DjReactionScreen screenId={screenId} />;
  }

  return <DjScreen screenId={screenId} />;
}
