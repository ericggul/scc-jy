import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GoldfishesNavigation from "@/components/navigation";
import {
  findGoldfishExperiment,
  getGoldfishExperimentsForDate,
  goldfishExperimentDateKeys,
  goldfishExperiments,
} from "@/components/experiments";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...goldfishExperimentDateKeys.map((dateKey) => ({
      experiment: [dateKey],
    })),
    ...goldfishExperiments.map((experiment) => ({
      experiment: experiment.key.split("/"),
    })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}): Promise<Metadata> {
  const { experiment: path } = await params;
  const dateExperiments =
    path.length === 1 ? getGoldfishExperimentsForDate(path[0]) : [];

  if (dateExperiments.length > 0) {
    return {
      title: `goldfishes ${path[0]}`,
      description: `Goldfishes experiments archived under ${path[0]}.`,
    };
  }

  const experiment = findGoldfishExperiment(path);

  if (!experiment) return { title: "goldfishes" };

  return {
    title: `goldfishes ${experiment.key}`,
    description: experiment.phrase,
  };
}

export default async function GoldfishesExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;
  const dateExperiments =
    path.length === 1 ? getGoldfishExperimentsForDate(path[0]) : [];

  if (dateExperiments.length > 0) {
    const experiments = dateExperiments.map(
      ({ key, section, date, phrase }) => ({ key, section, date, phrase }),
    );

    return (
      <GoldfishesNavigation experiments={experiments} archiveKey={path[0]} />
    );
  }

  const experiment = findGoldfishExperiment(path);

  if (!experiment) notFound();

  const { default: Component } = await experiment.load();
  return <Component />;
}
