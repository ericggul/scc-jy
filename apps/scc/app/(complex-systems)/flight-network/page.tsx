import type { Metadata } from "next";
import Link from "next/link";
import { flightNetworkExperiments } from "@/components/complex-systems/flight-network/experiments";

export const metadata: Metadata = {
  title: "flight network",
};

export default function FlightNetworkIndexPage() {
  return (
    <main className="min-h-screen bg-[#c9d8dc] p-4 text-[#17201c]">
      <h1 className="mb-6 max-w-[9ch] text-[clamp(52px,13vw,132px)] font-medium leading-[0.82] tracking-[-0.075em]">
        flight network
      </h1>
      <nav className="grid border-t border-[#17201c]">
        {flightNetworkExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/flight-network/${experiment.slug}`}
            className="border-b border-[#17201c] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#17201c] hover:text-[#c9d8dc]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
