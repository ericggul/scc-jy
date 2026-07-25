import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GridOne from "@/components/standalone/grid/1";
import GridTwo from "@/components/standalone/grid/2";
import {
  gridExperiments,
  isGridExperimentSlug,
} from "@/components/standalone/grid/experiments";

export function generateStaticParams() {
  return gridExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;

  return {
    title: `grid ${experiment}`,
    description:
      "A full-screen portrait grid of independently moving local media.",
  };
}

export default async function GridExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isGridExperimentSlug(experiment)) {
    notFound();
  }

  return experiment === "1" ? <GridOne /> : <GridTwo />;
}
