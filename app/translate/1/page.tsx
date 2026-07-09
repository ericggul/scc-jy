import type { Metadata } from "next";
import TranslateGridExperiment from "@/components/translate/1/TranslateGridExperiment";

export const metadata: Metadata = {
  title: "translate 1",
};

export default function TranslateOnePage() {
  return <TranslateGridExperiment />;
}
