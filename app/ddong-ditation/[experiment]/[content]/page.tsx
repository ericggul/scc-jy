import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DummyMeditationContent from "@/components/ddong-ditation/2/contents/dummy";
import {
  isMeditationContentSlug,
  meditationContents,
} from "@/components/ddong-ditation/2/model/content-catalog";

export function generateStaticParams() {
  return meditationContents.map((content) => ({
    experiment: "2",
    content: content.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string; content: string }>;
}): Promise<Metadata> {
  const { experiment, content } = await params;

  if (experiment !== "2" || !isMeditationContentSlug(content)) {
    return {};
  }

  const meditation = meditationContents.find(
    (item) => item.slug === content,
  );

  return {
    title: `${meditation?.title} — ddong-ditation`,
    description: meditation?.description,
  };
}

export default async function DdongDitationContentPage({
  params,
}: {
  params: Promise<{ experiment: string; content: string }>;
}) {
  const { experiment, content } = await params;

  if (experiment !== "2" || !isMeditationContentSlug(content)) {
    notFound();
  }

  return <DummyMeditationContent />;
}
