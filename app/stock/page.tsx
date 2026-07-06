import Link from "next/link";
import { stockExperiments } from "@/components/stock/experiments";

export default function StockIndexPage() {
  return (
    <main className="min-h-screen bg-[#080a0d] px-4 py-5 text-white md:px-6">
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-7xl content-between gap-10">
        <header className="flex items-center justify-between border-b border-white/12 pb-4">
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.24em] text-white/60">
            SCC
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#7ce7ff]">
            market interface clones
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#7ce7ff]">
              Stock lab
            </p>
            <h1 className="mt-5 max-w-3xl text-6xl font-black leading-none md:text-8xl">
              Five market screens from one data spine.
            </h1>
          </div>

          <nav className="grid border-t border-white/14">
            {stockExperiments.map((experiment) => (
              <Link
                key={experiment.slug}
                href={`/stock/${experiment.slug}`}
                className="group grid gap-2 border-b border-white/14 py-4 transition hover:bg-white hover:px-4 hover:text-[#080a0d] md:grid-cols-[96px_1fr_auto] md:items-center"
              >
                <span className="font-mono text-sm text-[#7ce7ff] group-hover:text-[#080a0d]">
                  {experiment.label}
                </span>
                <span className="text-3xl font-semibold md:text-5xl">
                  {experiment.reference}
                </span>
                <span aria-hidden="true" className="font-mono">
                  -&gt;
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-white/48">
          Shared symbols, index tape, sector breadth, risk metrics, news, and flow
          data are composed into five different trading-interface reference points.
        </p>
      </section>
    </main>
  );
}

