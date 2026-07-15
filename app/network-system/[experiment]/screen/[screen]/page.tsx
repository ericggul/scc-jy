import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NetworkSystemScreen, {
  NetworkSystemScreenExperience,
} from "@/components/network-system/macro-economy/screen";
import MarkovScreen, {
  MarkovScreenExperience,
} from "@/components/network-system/default/screen";
import PopulationScreen, {
  PopulationScreenExperience,
} from "@/components/network-system/population/screen";
import CompetitiveFirmsScreen, {
  CompetitiveFirmsScreenExperience,
} from "@/components/network-system/competitive-firms/screen";
import CycleScreen, {
  CycleVideoScreenExperience,
} from "@/components/network-system/cycle/screen";
import {
  cycleMediaScreenIds,
  isCycleMediaScreenId,
  isNetworkSystemExperimentSlug,
  isNetworkSystemScreenId,
  isNetworkSystemScreenRoute,
  networkSystemExperiments,
  networkSystemScreenIds,
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

  if (experiment === "cycle") {
    if (screen === "whole") {
      return <CycleVideoScreenExperience sides={cycleMediaScreenIds} />;
    }
    if (!isNetworkSystemScreenId(screen) && !isCycleMediaScreenId(screen)) {
      notFound();
    }
    return <CycleScreen screenId={screen} />;
  }

  if (experiment === "default") {
    if (screen === "whole") {
      return <MarkovScreenExperience screenIds={networkSystemScreenIds} />;
    }
    if (!isNetworkSystemScreenId(screen)) notFound();
    return <MarkovScreen screenId={screen} />;
  }

  if (experiment === "population") {
    if (screen === "whole") {
      return <PopulationScreenExperience screenIds={networkSystemScreenIds} />;
    }
    if (!isNetworkSystemScreenId(screen)) notFound();
    return <PopulationScreen screenId={screen} />;
  }

  if (experiment === "competitive-firms") {
    if (screen === "whole") {
      return <CompetitiveFirmsScreenExperience screenIds={networkSystemScreenIds} />;
    }
    if (!isNetworkSystemScreenId(screen)) notFound();
    return <CompetitiveFirmsScreen screenId={screen} />;
  }

  if (screen === "whole") {
    return <NetworkSystemScreenExperience screenIds={networkSystemScreenIds} />;
  }

  if (!isNetworkSystemScreenId(screen)) notFound();
  return <NetworkSystemScreen screenId={screen} />;
}
