import type { Metadata } from "next";
import Link from "next/link";
import { cValScreenIds } from "@/components/screens";

export const metadata: Metadata = { title: "c-val" };

export default function CValPage() {
  const routes = ["controller", "mobile", ...cValScreenIds.map((screen) => `screen/${screen}`), "screen/whole"];
  return (
    <main className="min-h-screen bg-[#f1f0eb] p-4 text-[#151512]">
      <h1 className="mb-6 text-[clamp(48px,12vw,120px)] font-black leading-none tracking-[-0.08em]">c-val</h1>
      <nav className="grid border-t border-current">
        {routes.map((route) => (
          <Link key={route} href={`/${route}`} className="border-b border-current py-4 text-[clamp(28px,7vw,72px)] font-black leading-none tracking-[-0.06em] hover:bg-[#151512] hover:text-[#f1f0eb]">
            {route}
          </Link>
        ))}
      </nav>
    </main>
  );
}
