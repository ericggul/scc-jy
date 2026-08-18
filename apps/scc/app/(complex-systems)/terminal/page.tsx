import type { Metadata } from "next";
import Link from "next/link";
import { terminalExperiments } from "@/components/complex-systems/terminal/experiments";

export const metadata: Metadata = {
  title: "complex-systems",
};

export default function TerminalIndexPage() {
  return (
    <main className="min-h-screen bg-[#e9e5db] p-4 text-[#242624]">
      <h1 className="mb-6 font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        terminal
      </h1>
      <nav className="grid border-t border-[#242624]">
        {terminalExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/terminal/${experiment.slug}`}
            className="border-b border-[#242624] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#242624] hover:text-[#e9e5db]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
