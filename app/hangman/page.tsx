import type { Metadata } from "next";
import Link from "next/link";
import { hangmanExperiments } from "@/components/hangman/experiments";

export const metadata: Metadata = { title: "hangman" };

export default function HangmanIndexPage() {
  return (
    <main className="min-h-screen bg-[#f1f2ed] p-4 text-[#171815]">
      <h1 className="mb-6 font-serif text-[clamp(56px,14vw,148px)] font-normal leading-[0.82] tracking-[-0.08em]">
        hangman
      </h1>
      <nav className="grid border-t border-[#171815]">
        {hangmanExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/hangman/${experiment.slug}`}
            className="border-b border-[#171815] py-4 text-[clamp(28px,7vw,72px)] font-bold leading-none tracking-[-0.06em] hover:bg-[#171815] hover:text-[#f1f2ed] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#254ee8]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
