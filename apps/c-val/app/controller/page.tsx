import type { Metadata } from "next";
import CValController from "@/components/controller";

export const metadata: Metadata = { title: "c-val controller" };

export default function CValControllerPage() {
  return <CValController />;
}
