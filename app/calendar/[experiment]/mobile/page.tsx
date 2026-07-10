import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalendarOneMobile from "@/components/calendar/1/mobile";
import { isCalendarExperimentSlug } from "@/components/calendar/experiments";

export const metadata: Metadata = {
  title: "calendar mobile",
};

export default async function CalendarExperimentMobileAliasPage({
  params,
}: {
  params: Promise<{ experiment: string }>;
}) {
  const { experiment } = await params;

  if (!isCalendarExperimentSlug(experiment)) {
    notFound();
  }

  return <CalendarOneMobile />;
}
