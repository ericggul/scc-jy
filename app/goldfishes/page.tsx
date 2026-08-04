import type { Metadata } from "next";
import Link from "next/link";
import { goldfishExperiments } from "@/components/goldfishes/experiments";

export const metadata: Metadata = {
  title: "goldfishes",
  description: "A chronological index of Goldfishes experiments.",
};

const defaultExperiments = goldfishExperiments.filter(
  (experiment) => experiment.section === "default",
);
const formatExperiments = goldfishExperiments.filter(
  (experiment) => experiment.section === "2d",
);
const datedExperiments = goldfishExperiments.filter(
  (experiment) => experiment.section === "dated",
);
const archiveDates = Array.from(
  new Set(datedExperiments.map((experiment) => experiment.date)),
).sort((first, second) => second.localeCompare(first));

function getExperimentName(key: string) {
  if (key === "default") return "Default";
  if (key === "2d/1") return "2D";
  const name = key.split("/").at(-1) ?? key;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function ExperimentLink({
  experiment,
}: {
  experiment: (typeof goldfishExperiments)[number];
}) {
  return (
    <Link
      href={`/goldfishes/${experiment.key}`}
      prefetch={false}
      className="group grid min-h-20 gap-2 rounded-sm px-4 py-4 transition-colors hover:bg-[#191a18] hover:text-[#f6f6f2] focus-visible:bg-[#191a18] focus-visible:text-[#f6f6f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191a18] sm:grid-cols-[9rem_1fr_1.5rem] sm:items-center sm:gap-6"
    >
      <span className="text-[22px] font-semibold leading-none tracking-[-0.035em] sm:text-[24px]">
        {getExperimentName(experiment.key)}
      </span>
      <span className="text-[14px] leading-snug text-[#62635e] group-hover:text-[#c9cac4] group-focus-visible:text-[#c9cac4] sm:text-[15px]">
        {experiment.phrase}
      </span>
      <span aria-hidden="true" className="hidden text-right text-lg sm:block">
        →
      </span>
    </Link>
  );
}

function ExperimentGroup({
  label,
  experiments,
}: {
  label: string;
  experiments: readonly (typeof goldfishExperiments)[number][];
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:gap-10">
      <h2 className="pt-4 font-mono text-[12px] leading-none tracking-[0.06em] text-[#686963]">
        {label}
      </h2>
      <div className="space-y-1">
        {experiments.map((experiment) => (
          <ExperimentLink key={experiment.key} experiment={experiment} />
        ))}
      </div>
    </section>
  );
}

export default function GoldfishesIndexPage() {
  return (
    <main className="min-h-screen bg-[#f6f6f2] px-5 py-7 text-[#191a18] sm:px-9 sm:py-10">
      <div className="mx-auto max-w-[1020px]">
        <header className="mb-14 sm:mb-20">
          <h1 className="text-[30px] font-semibold leading-none tracking-[-0.045em] sm:text-[36px]">
            Goldfishes
          </h1>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#686963] sm:text-[15px]">
            Choose the current baseline, a retained format, or a dated experiment.
          </p>
        </header>

        <nav aria-label="Goldfishes experiments" className="space-y-11 sm:space-y-14">
          <ExperimentGroup label="Current" experiments={defaultExperiments} />
          <ExperimentGroup label="Format" experiments={formatExperiments} />
          {archiveDates.map((date) => (
            <ExperimentGroup
              key={date}
              label={getDateLabel(date)}
              experiments={datedExperiments
                .filter((experiment) => experiment.date === date)
                .sort((first, second) => first.key.localeCompare(second.key))}
            />
          ))}
        </nav>
      </div>
    </main>
  );
}
