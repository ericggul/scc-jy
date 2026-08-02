import type { Metadata } from "next";
import Link from "next/link";
import { cValExperiments } from "@/components/c-val/experiments";

export const metadata: Metadata = { title: "c-val" };

export default function CValPage() {
  return (
    <main className="min-h-screen bg-[#f1f0eb] p-4 text-[#151512]">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        c-val
      </h1>
      <nav className="grid border-t border-current">
        {cValExperiments.flatMap((experiment) => [
          <Link
            key={`${experiment.version}-controller`}
            href={`/c-val/${experiment.version}/controller`}
            className="border-b border-current py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-[#151512] hover:text-[#f1f0eb]"
          >
            {experiment.version}/controller
          </Link>,
          <Link
            key={`${experiment.version}-mobile`}
            href={`/c-val/${experiment.version}/mobile`}
            className="border-b border-current py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-[#151512] hover:text-[#f1f0eb]"
          >
            {experiment.version}/mobile
          </Link>,
          ...experiment.screenIds.map((screenId) => (
            <Link
              key={`${experiment.version}-screen-${screenId}`}
              href={`/c-val/${experiment.version}/screen/${screenId}`}
              className="border-b border-current py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-[#151512] hover:text-[#f1f0eb]"
            >
              {experiment.version}/screen/{screenId}
            </Link>
          )),
          <Link
            key={`${experiment.version}-screen-whole`}
            href={`/c-val/${experiment.version}/screen/whole`}
            className="border-b border-current py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-[#151512] hover:text-[#f1f0eb]"
          >
            {experiment.version}/screen/whole
          </Link>,
        ])}
      </nav>
    </main>
  );
}
