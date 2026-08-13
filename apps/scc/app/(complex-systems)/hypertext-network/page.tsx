import type { Metadata } from "next";
import Link from "next/link";
import { hypertextNetworkExperiments } from "@/components/complex-systems/hypertext-network/experiments";

export const metadata: Metadata = {
  title: "hypertext network",
};

export default function HypertextNetworkIndexPage() {
  return (
    <main className="min-h-screen bg-[#dce2dc] p-4 text-[#17201c]">
      <h1 className="mb-6 max-w-[10ch] font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        hypertext network
      </h1>
      <nav className="grid border-t border-[#17201c]">
        {hypertextNetworkExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/hypertext-network/${experiment.slug}`}
            className="border-b border-[#17201c] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#17201c] hover:text-[#dce2dc]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
