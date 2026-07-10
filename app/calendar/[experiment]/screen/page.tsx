import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalendarOneScreen from "@/components/calendar/1/screen";
import { isCalendarExperimentSlug } from "@/components/calendar/experiments";

export const metadata: Metadata = {
  title: "calendar screen",
};

export default async function CalendarExperimentScreenAliasPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isCalendarExperimentSlug(experiment)) {
    notFound();
  }

  return <CalendarOneScreen />;
}
