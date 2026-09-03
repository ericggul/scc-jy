import type { Metadata } from "next";
import StatisticalModellingNavigation from "@/components/statistical-modelling/navigation";
import { getStatisticalModellingExperiments } from "@/components/statistical-modelling/navigation/model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "statistical-modelling",
  description: "A live index of runnable SCC statistical-modelling experiments.",
};

export default async function StatisticalModellingIndexPage() {
  const experiments = await getStatisticalModellingExperiments();
  return <StatisticalModellingNavigation experiments={experiments} />;
}
