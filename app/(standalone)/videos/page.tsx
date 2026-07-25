import type { Metadata } from "next";
import Link from "next/link";
import { videoExperiments } from "@/components/standalone/videos/experiments";

export const metadata: Metadata = {
  title: "videos",
};

export default function VideosIndexPage() {
  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">
        videos
      </h1>
      <nav className="grid border-t border-white">
        {videoExperiments.map((experiment) => (
          <Link
            key={experiment.slug}
            href={`/videos/${experiment.slug}`}
            className="border-b border-white py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-white hover:text-black"
          >
            {experiment.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
