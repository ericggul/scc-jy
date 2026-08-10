import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Interactive background — ddong-meong 3",
  description: "ddong-meong 3의 여섯 가지 인터랙티브 배경 테스트",
};

export function generateStaticParams() {
  return [{ experiment: "3" }];
}

export default async function DdongMeongTestingPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (experiment !== "3") {
    notFound();
  }

  redirect("/ddong-meong/3/testing/original");
}
