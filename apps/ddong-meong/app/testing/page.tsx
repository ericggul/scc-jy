import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { titleFor } from "../seo";

export const metadata: Metadata = {
  title: titleFor("인터랙티브 배경 테스트"),
  description: "똥멍 인터랙티브 배경의 내부 테스트 화면입니다.",
  robots: { index: false, follow: false },
};

export default function DdongMeongTestingPage() {
  redirect("/testing/original");
}
