import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValOneScreen, {
  CValScreenExperience as CValOneScreenExperience,
} from "@/components/c-val/1/screen";
import CValTwoScreen, {
  CValScreenExperience as CValTwoScreenExperience,
} from "@/components/c-val/2/screen";
import {
  cValExperiments,
  cValOneScreenIds,
  cValTwoScreenIds,
  isCValOneScreenId,
  isCValScreenRoute,
  isCValTwoScreenId,
  isCValVersion,
} from "@/components/c-val/experiments";

export function generateStaticParams() {
  return cValExperiments.flatMap((experiment) =>
    [...experiment.screenIds, ...experiment.archivedScreenIds, "whole"].map((screen) => ({
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

  if (version === "1") {
    if (screen === "whole") {
      return <CValOneScreenExperience screenIds={cValOneScreenIds} />;
    }
    if (!isCValOneScreenId(screen)) notFound();
    return <CValOneScreen screenId={screen} />;
  }

  if (screen === "whole") {
    return <CValTwoScreenExperience screenIds={cValTwoScreenIds} />;
  }
  if (!isCValTwoScreenId(screen)) notFound();
  return <CValTwoScreen screenId={screen} />;
}
