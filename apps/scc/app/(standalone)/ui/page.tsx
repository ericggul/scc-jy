import type { Metadata } from "next";
import UiNavigation from "@/components/ui/navigation";

export const metadata: Metadata = {
  title: "ui",
  description: "An index of runnable SCC UI experiments.",
};

export default function UiIndexPage() {
  return <UiNavigation />;
}
