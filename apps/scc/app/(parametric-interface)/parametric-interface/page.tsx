import ParametricInterfaceNavigation from "@/components/parametric-interface/navigation";
import { parametricInterfaceIndexEntries } from "@/components/parametric-interface/experiments";

export default function ParametricInterfaceIndexPage() {
  return <ParametricInterfaceNavigation experiments={parametricInterfaceIndexEntries} />;
}
