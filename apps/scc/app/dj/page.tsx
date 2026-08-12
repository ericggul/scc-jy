import type { Metadata } from "next";
import Link from "next/link";
import { djExperiments } from "@/components/dj/experiments";

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
            href={`/dj/${experiment.slug}/controller`}
            className="border-b border-[#f7f4ec] py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-[#f7f4ec] hover:text-[#050505]"
          >
            {experiment.slug}/controller
          </Link>
        ))}
        {djExperiments.flatMap((experiment) => [
          ...experiment.screenIds.map((screenId) => (
            <Link
              key={`screen-${experiment.slug}-${screenId}`}
              href={`/dj/${experiment.slug}/screen/${screenId}`}
              className="border-b border-[#f7f4ec] py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-[#f7f4ec] hover:text-[#050505]"
            >
              {experiment.slug}/screen/{screenId}
            </Link>
          )),
          <Link
            key={`screen-${experiment.slug}-whole`}
            href={`/dj/${experiment.slug}/screen/whole`}
            className="border-b border-[#f7f4ec] py-4 text-[clamp(28px,7vw,72px)] font-black leading-none hover:bg-[#f7f4ec] hover:text-[#050505]"
          >
            {experiment.slug}/screen/whole
          </Link>,
        ])}
      </nav>
    </main>
  );
}
