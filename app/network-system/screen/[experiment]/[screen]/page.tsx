import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NetworkSystemScreen, {
  NetworkSystemScreenExperience,
} from "@/components/network-system/1/screen";
import MarkovScreen, {
  MarkovScreenExperience,
} from "@/components/network-system/default/screen";
import {
  getNetworkSystemScreenIds,
  isNetworkSystemExperimentSlug,
  isNetworkSystemScreenId,
  isNetworkSystemScreenRoute,
  networkSystemExperiments,
} from "@/components/network-system/experiments";

export function generateStaticParams() {
  return networkSystemExperiments.flatMap((experiment) =>
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
  return { title: `network system ${experiment} screen ${screen}` };
}

export default async function NetworkSystemScreenPage({
  params,
}: {
  params: Promise<{ experiment: string; screen: string }>;
}) {
  const { experiment, screen } = await params;

  if (
    !isNetworkSystemExperimentSlug(experiment) ||
    !isNetworkSystemScreenRoute(experiment, screen)
  ) {
    notFound();
  }

  const screenIds = getNetworkSystemScreenIds(experiment);
  if (!screenIds) notFound();

  if (experiment === "default") {
    if (screen === "whole") {
      return <MarkovScreenExperience screenIds={screenIds} />;
    }
    if (!isNetworkSystemScreenId(screen)) notFound();
    return <MarkovScreen screenId={screen} />;
  }

  if (screen === "whole") {
    return <NetworkSystemScreenExperience screenIds={screenIds} />;
  }

  if (!isNetworkSystemScreenId(screen)) notFound();
  return <NetworkSystemScreen screenId={screen} />;
}
