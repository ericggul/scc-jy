import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CalendarOneScreen from "@/components/realtime/calendar/1/screen";
import {
  calendarExperiments,
  isCalendarExperimentSlug,
  type CalendarExperimentSlug,
} from "@/components/realtime/calendar/experiments";

const components: Record<CalendarExperimentSlug, ComponentType> = {
  "1": CalendarOneScreen,
};

export function generateStaticParams() {
  return calendarExperiments.map(({ slug: experiment }) => ({ experiment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experiment: string }>;
}): Promise<Metadata> {
  const { experiment } = await params;
  return { title: `calendar screen ${experiment}` };
}

export default async function CalendarScreenPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;
  if (!isCalendarExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
