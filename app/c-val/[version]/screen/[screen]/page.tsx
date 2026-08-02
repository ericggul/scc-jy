import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CValOneScreen, {
  CValScreenExperience as CValOneScreenExperience,
} from "@/components/c-val/1/screen";
import CValTwoScreen, {
  CValScreenExperience as CValTwoScreenExperience,
} from "@/components/c-val/2/screen";
import {
  cValExperiments,
  isCValScreenId,
  isCValScreenRoute,
  isCValVersion,
  type CValScreenId,
  type CValVersion,
} from "@/components/c-val/experiments";

type ScreenProps = { screenId: CValScreenId };
type ExperienceProps = { screenIds: readonly CValScreenId[] };

const screens: Record<CValVersion, ComponentType<ScreenProps>> = {
  "1": CValOneScreen,
  "2": CValTwoScreen,
};

const experiences: Record<CValVersion, ComponentType<ExperienceProps>> = {
  "1": CValOneScreenExperience,
  "2": CValTwoScreenExperience,
};

export function generateStaticParams() {
  return cValExperiments.flatMap((experiment) =>
    [...experiment.screenIds, "whole"].map((screen) => ({
      version: experiment.version,
      screen,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string; screen: string }>;
}): Promise<Metadata> {
  const { version, screen } = await params;
  return { title: `c-val ${version} screen ${screen}` };
}

export default async function CValScreenPage({
  params,
}: {
  params: Promise<{ version: string; screen: string }>;
}) {
  const { version, screen } = await params;
  if (!isCValVersion(version) || !isCValScreenRoute(version, screen)) {
    notFound();
  }
  if (screen === "whole") {
    const Experience = experiences[version];
    const screenIds = cValExperiments.find(
      (experiment) => experiment.version === version,
    )?.screenIds;
    if (!screenIds) notFound();
    return <Experience screenIds={screenIds} />;
  }
  if (!isCValScreenId(screen)) notFound();
  const Screen = screens[version];
  return <Screen screenId={screen} />;
}
