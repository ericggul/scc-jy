import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoField from "@/components/standalone/videos/screen";
import {
  getVideoExperiment,
  isVideoExperimentSlug,
  videoExperiments,
} from "@/components/standalone/videos/experiments";

export function generateStaticParams() {
  return videoExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;

  return {
    title: `videos ${experiment}`,
    description:
      "A portrait media field in which local clips move through different rates and phases.",
  };
}

export default async function VideoExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isVideoExperimentSlug(experiment)) {
    notFound();
  }

  return <VideoField experiment={getVideoExperiment(experiment)} />;
}
