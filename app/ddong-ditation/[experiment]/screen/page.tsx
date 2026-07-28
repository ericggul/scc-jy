import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DdongDitationTwoScreen from "@/components/ddong-ditation/2/screen";

export const metadata: Metadata = {
  title: "ddong-ditation 2 screen",
};

export function generateStaticParams() {
  return [{ experiment: "2" }];
}

export default async function DdongDitationExperimentScreenPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (experiment !== "2") {
    notFound();
  }

  return <DdongDitationTwoScreen />;
}
