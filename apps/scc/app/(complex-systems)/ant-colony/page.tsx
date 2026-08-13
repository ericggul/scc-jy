import type { Metadata } from "next";
import Link from "next/link";
import { antColonyExperiments } from "@/components/complex-systems/ant-colony/experiments";

export const metadata: Metadata = {
  title: "ant colony",
};

export default function AntColonyIndexPage() {
  return (
    <main className="min-h-screen bg-[#e2e6e0] p-4 text-[#17201c]">
      <h1 className="mb-6 font-serif text-[clamp(48px,12vw,120px)] leading-[0.86] tracking-[-0.07em]">
        ant colony
      </h1>
      <nav className="grid border-t border-[#17201c]">
        {antColonyExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/ant-colony/${experiment.slug}`}
            className="border-b border-[#17201c] py-4 font-mono text-[clamp(24px,6vw,64px)] leading-none tracking-[-0.06em] hover:bg-[#17201c] hover:text-[#e2e6e0]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
