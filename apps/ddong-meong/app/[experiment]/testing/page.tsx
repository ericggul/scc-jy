import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Interactive background — ddong-meong",
  description: "ddong-meong의 여섯 가지 인터랙티브 배경 테스트",
};

export function generateStaticParams() {
  return [{ experiment: "3" }, { experiment: "4" }];
}

export default async function DdongMeongTestingPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (experiment !== "3" && experiment !== "4") {
    notFound();
  }

  redirect(`/${experiment}/testing/original`);
}
