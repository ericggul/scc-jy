import type { Metadata } from "next";
import Link from "next/link";
import { djExperiments, djScreenIds } from "@/components/dj/experiments";

export const metadata: Metadata = {
  title: "dj",
};

export default function DjPage() {
  return (
    <main className="min-h-screen bg-[#050505] p-4 text-[#f7f4ec]">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none">
        dj
      </h1>
      <nav className="grid border-t border-[#f7f4ec]">
        {djExperiments.map((experiment) => (
          <Link
            key={`controller-${experiment.slug}`}
            href={`/dj/controller/${experiment.slug}`}
            className="border-b border-[#f7f4ec] py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-[#f7f4ec] hover:text-[#050505]"
          >
            controller/{experiment.slug}
          </Link>
        ))}
        {djExperiments.flatMap((experiment) => [
          ...djScreenIds.map((screenId) => (
            <Link
              key={`screen-${experiment.slug}-${screenId}`}
              href={`/dj/screen/${experiment.slug}/${screenId}`}
              className="border-b border-[#f7f4ec] py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-[#f7f4ec] hover:text-[#050505]"
            >
              screen/{experiment.slug}/{screenId}
            </Link>
          )),
          <Link
            key={`screen-${experiment.slug}-whole`}
            href={`/dj/screen/${experiment.slug}/whole`}
            className="border-b border-[#f7f4ec] py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-[#f7f4ec] hover:text-[#050505]"
          >
            screen/{experiment.slug}/whole
          </Link>,
        ])}
      </nav>
    </main>
  );
}
