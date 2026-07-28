import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DdongDitationTwoMobile from "@/components/ddong-ditation/2/mobile";

export function generateStaticParams() {
  return [{ experiment: "2" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `ddong-ditation ${experiment}`,
    description: "A toilet-seat meditation for letting go.",
  };
}

export default async function DdongDitationExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (experiment !== "2") {
    notFound();
  }

  return <DdongDitationTwoMobile />;
}
