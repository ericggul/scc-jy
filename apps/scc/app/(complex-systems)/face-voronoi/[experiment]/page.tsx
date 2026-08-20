import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FaceVoronoiPortraitField from "@/components/complex-systems/face-voronoi/1";
import FaceVoronoiPopulation from "@/components/complex-systems/face-voronoi/2";
import FaceVoronoiMaterialField from "@/components/complex-systems/face-voronoi/3";
import {
  isFaceVoronoiExperimentSlug,
  faceVoronoiExperiments,
} from "@/components/complex-systems/face-voronoi/experiments";

export function generateStaticParams() {
  return faceVoronoiExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `face-voronoi/${experiment}`,
    description:
      experiment === "1"
        ? "Living portrait photographs clipped to changing Voronoi territories."
        : experiment === "2"
          ? "A living Voronoi population pulse with monochrome, face, and politician renderers."
          : "A moving Voronoi material field with colour and portrait-gradient modes.",
  };
}

export default async function FaceVoronoiExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isFaceVoronoiExperimentSlug(experiment)) notFound();
  if (experiment === "1") return <FaceVoronoiPortraitField />;
  if (experiment === "2") return <FaceVoronoiPopulation />;
  return <FaceVoronoiMaterialField />;
}
