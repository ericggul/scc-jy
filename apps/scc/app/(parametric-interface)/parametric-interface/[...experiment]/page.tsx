import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ParametricInterfaceArchive from "@/components/parametric-interface/archive";
import {
  findParametricInterfaceExperiment,
  getParametricInterfaceExperimentsForDate,
  parametricInterfaceExperimentDateKeys,
  parametricInterfaceExperiments,
} from "@/components/parametric-interface/experiments";

export const dynamicParams = false;
export const metadata: Metadata = { title: "parametric-interface" };

export function generateStaticParams() {
  return [
    ...parametricInterfaceExperiments
      .filter((entry) => entry.section === "default")
      .map((entry) => ({ experiment: [entry.key] })),
    ...parametricInterfaceExperimentDateKeys.map((dateKey) => ({
      experiment: [dateKey],
    })),
    ...parametricInterfaceExperiments
      .filter((entry) => entry.section === "dated")
      .map((entry) => ({ experiment: entry.key.split("/") })),
  ];
}

export default async function ParametricInterfaceExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string[] }>;
}) {
  const { experiment: path } = await params;
  const dateExperiments =
    path.length === 1 ? getParametricInterfaceExperimentsForDate(path[0]) : [];

  if (dateExperiments.length > 0) {
    return <ParametricInterfaceArchive dateKey={path[0]} experiments={dateExperiments} />;
  }

  const experiment = findParametricInterfaceExperiment(path);
  if (!experiment) notFound();

  const { default: Component } = await experiment.load();
  return <Component />;
}
