import type { Metadata } from "next";
import DynamicalSystemsNavigation from "@/components/dynamical-systems/navigation";
import { getDynamicalSystemExperiments } from "@/components/dynamical-systems/navigation/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "dynamical-systems",
  description: "A live index of runnable SCC dynamical-systems experiments.",
};

export default async function DynamicalSystemsIndexPage() {
  const experiments = await getDynamicalSystemExperiments();
  return <DynamicalSystemsNavigation experiments={experiments} />;
}
