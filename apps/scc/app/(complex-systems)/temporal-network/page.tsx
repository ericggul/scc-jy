import type { Metadata } from "next";
import Link from "next/link";
import { temporalNetworkExperiments } from "@/components/complex-systems/temporal-network/experiments";

export const metadata: Metadata = { title: "complex-systems" };

export default function TemporalNetworkIndexPage() {
  return (
    <main className="min-h-screen bg-[#28222b] p-6 text-[#ded6be]">
      <nav aria-label="Temporal network experiments" className="grid gap-3 text-xl">
        {temporalNetworkExperiments.map((experiment) => (
          <Link key={experiment.slug} href={`/temporal-network/${experiment.slug}`}>
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
