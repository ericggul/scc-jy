import type { Metadata } from "next";
import Link from "next/link";
import { artificialLanguageExperiments } from "@/components/complex-systems/artificial-language/experiments";

export const metadata: Metadata = {
  title: "artificial language",
};

export default function ArtificialLanguageIndexPage() {
  return (
    <main className="min-h-screen bg-[#e4e1d3] p-4 text-[#24313a]">
      <h1 className="mb-6 font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        artificial language
      </h1>
      <nav className="grid border-t border-[#24313a]">
        {artificialLanguageExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/artificial-language/${experiment.slug}`}
            className="border-b border-[#24313a] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#24313a] hover:text-[#e4e1d3]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
