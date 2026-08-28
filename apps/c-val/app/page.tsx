import type { Metadata } from "next";
import CValHome from "@/components/home";

export const metadata: Metadata = {
  title: "C-VAL: Conducting Volatility, Activity, Liquidity",
  description: "C-VAL is a multi-device web artwork where audience mobile movement conducts a simulated market.",
};

export default function CValPage() {
  return <CValHome />;
}
