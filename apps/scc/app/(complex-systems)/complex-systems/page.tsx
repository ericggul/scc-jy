import type { Metadata } from "next";
import ComplexSystemsNavigation from "@/components/complex-systems/navigation";
import { getComplexSystemExperiments } from "@/components/complex-systems/navigation/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "complex-systems",
  description: "A live index of runnable SCC complex-systems experiments.",
};

export default async function ComplexSystemsIndexPage() {
  const experiments = await getComplexSystemExperiments();
  return <ComplexSystemsNavigation experiments={experiments} />;
}
