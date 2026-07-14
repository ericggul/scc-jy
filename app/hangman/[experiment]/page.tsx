import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import HangmanOne from "@/components/hangman/1";
import {
  hangmanExperiments,
  isHangmanExperimentSlug,
  type HangmanExperimentSlug,
} from "@/components/hangman/experiments";

const components: Record<HangmanExperimentSlug, ComponentType> = {
  "1": HangmanOne,
};

export function generateStaticParams() {
  return hangmanExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `hangman ${experiment}` };
}

export default async function HangmanExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isHangmanExperimentSlug(experiment)) notFound();

  const Component = components[experiment];
  return <Component />;
}
