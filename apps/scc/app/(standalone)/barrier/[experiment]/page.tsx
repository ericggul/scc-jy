import { notFound } from "next/navigation";
import BarrierDefault from "@/components/standalone/barrier/default/index";
import BarrierOne from "@/components/standalone/barrier/1/index";
import BarrierTwo from "@/components/standalone/barrier/2/index";
import { barrierExperiments, barrierTitle, isBarrierExperimentSlug, type BarrierExperimentSlug } from "@/components/standalone/barrier/experiments";

export const metadata = { title: barrierTitle };
export function generateStaticParams() {
  return barrierExperiments.map(({ slug }) => ({ experiment: slug }));
}
const components = { default: BarrierDefault, "1": BarrierOne, "2": BarrierTwo } satisfies Record<BarrierExperimentSlug, typeof BarrierDefault>;
export default async function BarrierPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!isBarrierExperimentSlug(experiment)) notFound();
  const Component = components[experiment];
  return <Component />;
}
