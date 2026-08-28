import type { Metadata } from "next";
import CValController from "@/components/controller";

export const metadata: Metadata = {
  title: "C-VAL controller",
  robots: { index: false, follow: false },
};

export default function CValControllerPage() {
  return <CValController />;
}
