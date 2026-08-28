import type { Metadata } from "next";
import { CValGoogleAnalytics } from "@/components/analytics";
import CValMobile from "@/components/mobile";
import { cValMobileMetadata } from "@/components/seo";

export const metadata: Metadata = cValMobileMetadata;

export default function CValMobilePage() {
  return (
    <>
      <CValMobile />
      <CValGoogleAnalytics />
    </>
  );
}
