import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "w1",
};

const routes = [
  {
    href: "/w1/mobile",
    label: "Mobile",
    description: "Phone-side touch surface for sending w1 socket signals.",
  },
  {
    href: "/w1/screen",
    label: "Screen",
    description: "Display-side receiver for w1 projection output.",
  },
];

export default function W1Page() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-6 py-8 text-[#171717] sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-between">
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link href="/">SCC</Link>
          <span>w1</span>
        </div>

        <div className="grid gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-5 max-w-lg text-sm uppercase tracking-[0.22em] text-[#6f6a61]">
              mobile / screen
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] sm:text-7xl">
              A small isolated relay experiment.
            </h1>
          </div>

          <div className="grid gap-3">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group grid gap-3 border border-[#171717]/15 bg-white/45 p-5 transition hover:border-[#171717]/55 hover:bg-white/80"
              >
                <span className="flex items-center justify-between text-2xl font-medium">
                  {route.label}
                  <span
                    aria-hidden="true"
                    className="transition group-hover:translate-x-1"
                  >
                    -&gt;
                  </span>
                </span>
                <span className="max-w-sm text-sm leading-6 text-[#6f6a61]">
                  {route.description}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-[#6f6a61]">
          `w1` uses only `w1:*` socket events and the `experiment:w1` room.
          Future experiments should define their own socket module before adding
          mobile or screen routes.
        </p>
      </section>
    </main>
  );
}
