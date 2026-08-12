import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import CalendarDefault from "@/components/realtime/calendar/default";
import {
  calendarDirectRoutes,
  isCalendarDirectRoute,
  type CalendarDirectRoute,
} from "@/components/realtime/calendar/experiments";

const components: Record<CalendarDirectRoute, ComponentType> = {
  default: CalendarDefault,
};

export function generateStaticParams() {
  return calendarDirectRoutes.map((experiment) => ({
    experiment,
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

  if (!isCalendarDirectRoute(experiment)) {
    notFound();
  }

  const Component = components[experiment];
  return <Component />;
}
