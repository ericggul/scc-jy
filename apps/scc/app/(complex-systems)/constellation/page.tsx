import type { Metadata } from "next";
import Link from "next/link";
import { constellationExperiments } from "@/components/complex-systems/constellation/experiments";

export const metadata: Metadata = {
  title: "constellation",
};

export default function ConstellationIndexPage() {
  return (
    <main className="min-h-screen bg-[#e5e7e4] p-4 text-[#151917]">
      <h1 className="mb-6 font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        constellation
      </h1>
      <nav className="grid border-t border-[#151917]">
        {constellationExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/constellation/${experiment.slug}`}
            className="border-b border-[#151917] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#151917] hover:text-[#e5e7e4]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
