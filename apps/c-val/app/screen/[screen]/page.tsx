import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CValScreen from "@/components/screen";
import { cValScreenIds, isCValScreenRoute } from "@/components/screens";
import CValWhole from "@/components/whole";

export function generateStaticParams() {
  return [...cValScreenIds, "whole"].map((screen) => ({ screen }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ screen: string }>;
}): Promise<Metadata> {
  const { screen } = await params;
  return {
    title: `C-VAL screen ${screen}`,
    robots: { index: false, follow: false },
  };
}

export default async function CValScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!isCValScreenRoute(screen)) notFound();
  if (screen === "whole") return <CValWhole />;
  return <CValScreen screenId={screen} />;
}
