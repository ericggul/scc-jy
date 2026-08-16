import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DdongMeongContent from "@/components/mobile/content";
import { mobileMeditationContents } from "@/components/mobile/content/registry";
import { titleFor } from "../seo";

function findContent(content: string) {
  return mobileMeditationContents.find((meditation) => meditation.slug === content);
}

export function generateStaticParams() {
  return mobileMeditationContents.map(({ slug }) => ({ content: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ content: string }>;
}): Promise<Metadata> {
  const { content } = await params;
  const meditation = findContent(content);

  if (!meditation) return {};

  return {
    title: titleFor(meditation.title),
    description: meditation.description,
    alternates: { canonical: `/${meditation.slug}` },
  };
}

export default async function DdongMeongContentPage({
  params,
}: {
  params: Promise<{ content: string }>;
}) {
  const { content } = await params;
  const meditation = findContent(content);

  if (!meditation) notFound();

  return <DdongMeongContent slug={meditation.slug} />;
}
