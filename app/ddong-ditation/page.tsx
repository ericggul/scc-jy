import type { Metadata } from "next";
import DdongDitationMobile from "@/components/ddong-ditation/1/mobile";

export const metadata: Metadata = {
  title: "ddong-ditation",
  description: "A toilet-seat meditation for letting go.",
};

export default function DdongDitationPage() {
  return <DdongDitationMobile />;
}

