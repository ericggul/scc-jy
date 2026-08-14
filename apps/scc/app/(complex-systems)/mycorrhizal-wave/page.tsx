import type { Metadata } from "next";
import Link from "next/link";
import { mycorrhizalWaveExperiments } from "@/components/complex-systems/mycorrhizal-wave/experiments";

export const metadata: Metadata = { title: "mycorrhizal wave" };

export default function MycorrhizalWaveIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <h1 className="mb-8 text-[clamp(42px,10vw,112px)] font-normal leading-[0.88] tracking-[-0.065em]">
        mycorrhizal wave
      </h1>
      <nav className="grid border-t border-black">
        {mycorrhizalWaveExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/mycorrhizal-wave/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(20px,4vw,48px)] leading-none tracking-[-0.045em] hover:bg-black hover:text-white"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
