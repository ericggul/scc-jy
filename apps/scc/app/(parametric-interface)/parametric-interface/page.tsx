import type { Metadata } from "next";
import ParametricInterfaceNavigation from "@/components/parametric-interface/navigation";
import { parametricInterfaceIndexEntries } from "@/components/parametric-interface/experiments";

export const metadata: Metadata = { title: "parametric-interface" };

export default function ParametricInterfaceIndexPage() {
  return <ParametricInterfaceNavigation experiments={parametricInterfaceIndexEntries} />;
}
