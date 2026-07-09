import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjScreen, { DjScreenExperience } from "@/components/dj/1/screen";
import {
  djScreenIds,
  isDjScreenId,
  isDjScreenRoute,
} from "@/components/dj/experiments";

export function generateStaticParams() {
  return [...djScreenIds, "whole"].map((screen) => ({
    screen,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ screen: string }>;
}): Promise<Metadata> {
  const { screen } = await params;
  return {
    title: `dj screen ${screen}`,
  };
}

export default async function DjScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;

  if (!isDjScreenRoute(screen)) {
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
