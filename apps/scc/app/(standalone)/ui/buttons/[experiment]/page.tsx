import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ButtonOne from "@/components/ui/buttons/1";
import ButtonTwo from "@/components/ui/buttons/2";
import ButtonThree from "@/components/ui/buttons/3";
import {
  buttonExperiments,
  isButtonExperimentSlug,
} from "@/components/ui/buttons/experiments";

export function generateStaticParams() {
  return buttonExperiments.map(({ slug }) => ({ experiment: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;

  return {
    title: `ui buttons ${experiment}`,
    description: "A responsive field of locally interactive web-culture buttons.",
  };
}

export default async function ButtonExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isButtonExperimentSlug(experiment)) {
    notFound();
  }

  if (experiment === "1") return <ButtonOne />;
  if (experiment === "2") return <ButtonTwo />;
  return <ButtonThree />;
}
