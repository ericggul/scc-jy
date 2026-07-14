import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import VideoPlayerOne from "@/components/video-player/1";
import {
  isVideoPlayerExperimentSlug,
  videoPlayerExperiments,
  type VideoPlayerExperimentSlug,
} from "@/components/video-player/experiments";

const components: Record<VideoPlayerExperimentSlug, ComponentType> = {
  "1": VideoPlayerOne,
};

export function generateStaticParams() {
  return videoPlayerExperiments.map((experiment) => ({
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
    title: `video-player ${experiment}`,
  };
}

export default async function VideoPlayerExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isVideoPlayerExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
