import { notFound } from "next/navigation";
import AerodynamicsOne from "@/components/standalone/aerodynamics/1";
import AerodynamicsTwo from "@/components/standalone/aerodynamics/2";
import { aerodynamicsExperiments } from "@/components/standalone/aerodynamics/experiments";

export const metadata = { title: "Airflow" };
export function generateStaticParams() { return aerodynamicsExperiments.map(({ slug }) => ({ experiment: slug })); }
export default async function Page({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!aerodynamicsExperiments.some(({ slug }) => slug === experiment)) notFound();
  return experiment === "1" ? <AerodynamicsOne /> : <AerodynamicsTwo />;
}
