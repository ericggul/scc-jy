import type { Metadata } from "next";
import CValWhole from "@/components/whole";

export const metadata: Metadata = {
  title: "C-VAL whole",
  robots: { index: false, follow: false },
};

export default function CValWholePage() {
  return <CValWhole />;
}
