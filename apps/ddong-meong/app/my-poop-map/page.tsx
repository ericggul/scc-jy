import type { Metadata } from "next";
import MyPoopMap from "@/components/mobile/my-poop-map";
import { titleFor } from "../seo";

export const metadata: Metadata = {
  title: titleFor("나의 똥트맵"),
  description: "나의 사적인 사건을 삼차원 똥트맵으로 읽고 공유합니다.",
  alternates: { canonical: "/my-poop-map" },
};

export default function MyPoopMapPage() {
  return <MyPoopMap />;
}

