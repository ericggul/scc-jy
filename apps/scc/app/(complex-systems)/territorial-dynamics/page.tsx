import type { Metadata } from "next";
import Link from "next/link";
import { territorialDynamicsExperiments } from "@/components/complex-systems/territorial-dynamics/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function TerritorialDynamicsIndexPage() {
  return (
    <main className="min-h-screen bg-[#d9e0d9] p-4 text-[#1c2922]">
      <h1 className="mb-6 font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        territorial dynamics
      </h1>
      <nav className="grid border-t border-[#1c2922]">
        {territorialDynamicsExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/territorial-dynamics/${experiment.slug}`}
            className="border-b border-[#1c2922] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#1c2922] hover:text-[#d9e0d9]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
