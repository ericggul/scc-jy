import type { Metadata } from "next";
import DdongMeongScreen from "@/components/screen-event-field-legacy";
import { titleFor } from "../seo";

export const metadata: Metadata = {
  title: titleFor("전시장 화면"),
  description: "똥멍 모바일 세션의 실시간 전시장 화면입니다.",
  robots: { index: false, follow: false },
};

export default function DdongMeongScreenPage() {
  return <DdongMeongScreen />;
}
