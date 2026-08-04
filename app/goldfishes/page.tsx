import type { Metadata } from "next";
import GoldfishesNavigation from "@/components/goldfishes/navigation";
import { goldfishExperiments } from "@/components/goldfishes/experiments";

export const metadata: Metadata = {
  title: "goldfishes",
  description: "A searchable chronological index of Goldfishes experiments.",
};

export default function GoldfishesIndexPage() {
  const experiments = goldfishExperiments.map(
    ({ key, section, date, phrase }) => ({ key, section, date, phrase }),
  );

  return <GoldfishesNavigation experiments={experiments} />;
}
