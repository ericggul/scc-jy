import type { Metadata } from "next";
import Link from "next/link";
import { stockExperiments } from "@/components/stock/experiments";

export const metadata: Metadata = {
  title: "stock",
};

export default function StockIndexPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] p-4 text-[#f5f5f7]">
      <nav className="grid w-full max-w-[760px] overflow-hidden rounded-[8px] bg-[#111113] ring-1 ring-white/[0.08]">
        {stockExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/stock/${experiment.slug}`}
            className="border-b border-white/[0.075] px-5 py-5 text-[28px] font-semibold leading-none last:border-b-0 hover:bg-white/[0.06]"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
