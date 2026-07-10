import type { Metadata } from "next";
import Link from "next/link";
import { calendarExperiments } from "@/components/calendar/experiments";

export const metadata: Metadata = {
  title: "calendar",
};

export default function CalendarIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        calendar
      </h1>
      <nav className="grid border-t border-black">
        <Link
          href="/calendar/default"
          className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
        >
          default
        </Link>
        {calendarExperiments.flatMap((experiment) => [
          <Link
            key={`mobile-${experiment.slug}`}
            href={`/calendar/mobile/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            mobile/{experiment.slug}
          </Link>,
          <Link
            key={`screen-${experiment.slug}`}
            href={`/calendar/screen/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            screen/{experiment.slug}
          </Link>,
        ])}
      </nav>
    </main>
  );
}
