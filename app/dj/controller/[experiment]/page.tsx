import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DjController from "@/components/dj/1/controller";
import {
  djExperiments,
  isDjExperimentSlug,
} from "@/components/dj/experiments";

export function generateStaticParams() {
  return djExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `dj controller ${experiment}`,
  };
}

export default async function DjControllerPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isDjExperimentSlug(experiment)) {
    notFound();
  }

  return <DjController />;
}
