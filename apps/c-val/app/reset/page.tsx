import type { Metadata } from "next";
import CValReset from "@/components/reset";

export const metadata: Metadata = {
  title: "C-VAL reset",
  robots: { index: false, follow: false },
};

export default function CValResetPage() {
  return <CValReset />;
}
