import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import TableOne from "@/components/table/1";
import {
  isTableExperimentSlug,
  tableExperiments,
  type TableExperimentSlug,
} from "@/components/table/experiments";

const components: Record<TableExperimentSlug, ComponentType> = {
  "1": TableOne,
};

export function generateStaticParams() {
  return tableExperiments.map((experiment) => ({
    experiment: experiment.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return {
    title: `table ${experiment}`,
  };
}

export default async function TableExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isTableExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
