import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SmileOne from "@/components/ui/smile/1";
import {
  isSmileExperimentSlug,
  smileExperiments,
} from "@/components/ui/smile/experiments";

export function generateStaticParams() {
  return smileExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;

  return {
    title: `ui smile ${experiment}`,
    description: "A responsive field of airport-style smile feedback buttons.",
  };
}

export default async function SmileExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isSmileExperimentSlug(experiment)) {
    notFound();
  }

  return <SmileOne />;
}
