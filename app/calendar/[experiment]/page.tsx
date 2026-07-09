import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CalendarOne from "@/components/calendar/1";
import {
  calendarExperiments,
  isCalendarExperimentSlug,
  type CalendarExperimentSlug,
} from "@/components/calendar/experiments";

const components: Record<CalendarExperimentSlug, ComponentType> = {
  "1": CalendarOne,
};

export function generateStaticParams() {
  return calendarExperiments.map((experiment) => ({
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
    title: `calendar ${experiment}`,
  };
}

export default async function CalendarExperimentPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isCalendarExperimentSlug(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
