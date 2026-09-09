import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChessOne from "@/components/standalone/chess/1";
import ChessTwo from "@/components/standalone/chess/2";
import ChessThree from "@/components/standalone/chess/3";
import ChessFour from "@/components/standalone/chess/4";
import { chessExperiments, isChessExperimentSlug } from "@/components/standalone/chess/experiments";

export const metadata: Metadata = {
  title: "Chess",
  description: "A semantic chess simulation across planar and twisted coordinate fields.",
};

export function generateStaticParams() {
  return chessExperiments.map(({ slug }) => ({ experiment: slug }));
}

export default async function ChessPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isChessExperimentSlug(experiment)) notFound();
  return experiment === "1" ? <ChessOne /> : experiment === "2" ? <ChessTwo /> : experiment === "3" ? <ChessThree /> : <ChessFour />;
}
