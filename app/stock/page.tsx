import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "stock",
};

export default function StockIndexPage() {
  return (
    <main className="min-h-screen bg-white p-4 text-black">
      <Link
        href="/stock/test"
        className="text-[clamp(28px,7vw,72px)] font-black leading-none hover:underline"
      >
        stock/test
      </Link>
    </main>
  );
}
