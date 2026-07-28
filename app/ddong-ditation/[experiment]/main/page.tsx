import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DdongDitationTwoMain from "@/components/ddong-ditation/2/main";

export const metadata: Metadata = {
  title: "ddong-ditation — 명상 콘텐츠",
  description: "4분 33초 동안 몸의 감각과 호흡에 집중하는 명상.",
};

export function generateStaticParams() {
  return [{ experiment: "2" }];
}

export default async function DdongDitationMainPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (experiment !== "2") {
    notFound();
  }

  return <DdongDitationTwoMain />;
}
