import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  backgroundExperiments,
  findBackgroundExperiment,
} from "@/components/testing/interactive-background-lab/registry";
import { titleFor } from "../../seo";

export function generateStaticParams() {
  return backgroundExperiments.map(({ slug }) => ({ visual: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ visual: string }>;
}): Promise<Metadata> {
  const { visual } = await params;
  const backgroundExperiment = findBackgroundExperiment(visual);

  if (!backgroundExperiment) return {};

  return {
    title: titleFor("인터랙티브 배경 테스트"),
    description: "똥멍 인터랙티브 배경의 내부 테스트 화면입니다.",
    robots: { index: false, follow: false },
  };
}

export default async function DdongMeongBackgroundTestingPage({
  params,
}: {
  params: Promise<{ visual: string }>;
}) {
  const { visual } = await params;
  const backgroundExperiment = findBackgroundExperiment(visual);

  if (!backgroundExperiment) notFound();

  redirect("/testing");
}
