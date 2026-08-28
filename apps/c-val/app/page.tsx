import type { Metadata } from "next";
import { CValGoogleAnalytics } from "@/components/analytics";
import CValHome from "@/components/home";
import { cValHomeMetadata, CValStructuredData } from "@/components/seo";

export const metadata: Metadata = cValHomeMetadata;

export default function CValPage() {
  return (
    <>
      <CValStructuredData />
      <CValHome />
      <CValGoogleAnalytics />
    </>
  );
}
