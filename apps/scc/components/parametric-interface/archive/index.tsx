import Link from "next/link";
import type { ParametricInterfaceExperiment } from "../experiments";

export default function ParametricInterfaceArchive({
  dateKey,
  experiments,
}: {
  dateKey: string;
  experiments: readonly ParametricInterfaceExperiment[];
}) {
  return (
    <main className="min-h-screen bg-[#111517] p-5 font-mono text-[#e4e2d7]">
      <nav aria-label={`${dateKey} parametric interface experiments`} className="grid border-t border-[#49504d]">
        {experiments.map((experiment) => {
          const name = experiment.key.split("/").at(-1) ?? experiment.key;
          return (
            <Link
              key={experiment.key}
              href={`/parametric-interface/${experiment.key}`}
              target="_blank"
              rel="noreferrer"
              className="group grid min-h-16 grid-cols-[8rem_1fr_auto] items-center gap-4 border-b border-[#49504d] px-1 text-[12px] hover:bg-[#e4e2d7] hover:text-[#111517]"
            >
              <span>{name}</span>
              <span className="text-[#9fa7a1] group-hover:text-[#111517]">{experiment.phrase}</span>
              <span aria-hidden="true">→</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
