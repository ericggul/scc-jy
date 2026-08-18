import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValScreen, { CValScreenExperience } from "@/components/screen";
import { cValScreenIds, isCValScreenRoute } from "@/components/screens";

export function generateStaticParams() {
  return [...cValScreenIds, "whole"].map((screen) => ({ screen }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ screen: string }>;
}): Promise<Metadata> {
  const { screen } = await params;
  return { title: `c-val screen ${screen}` };
}

export default async function CValScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!isCValScreenRoute(screen)) notFound();
  if (screen === "whole") return <CValScreenExperience screenIds={cValScreenIds} />;
  return <CValScreen screenId={screen} />;
}
