import type { Metadata } from "next";
import Link from "next/link";
import { fingerSkatingExperiments } from "@/components/finger-skating/experiments";

export const metadata: Metadata = {
  title: "finger-skating",
};

export default function FingerSkatingPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] p-4 text-[#171717]">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        finger-skating
      </h1>
      <nav className="grid border-t border-black">
        {fingerSkatingExperiments.flatMap((experiment) => [
          <Link
            key={`mobile-${experiment.slug}`}
            href={`/finger-skating/mobile/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            mobile/{experiment.slug}
          </Link>,
          <Link
            key={`screen-${experiment.slug}`}
            href={`/finger-skating/screen/${experiment.slug}`}
            className="border-b border-black py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-black hover:text-white"
          >
            screen/{experiment.slug}
          </Link>,
        ])}
      </nav>
    </main>
  );
}
