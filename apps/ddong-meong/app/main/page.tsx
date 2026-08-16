import type { Metadata } from "next";
import DdongMeongMain from "@/components/mobile/main";
import { pageDescription, titleFor } from "../seo";

export const metadata: Metadata = {
  title: titleFor("오늘의 콘텐츠"),
  description: pageDescription,
  alternates: { canonical: "/main" },
};

export default function DdongMeongMainPage() {
  return <DdongMeongMain />;
}
