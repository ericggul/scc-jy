import type { Metadata } from "next";
import { Suspense } from "react";
import DdongMeongShare from "@/components/mobile/share";
import { titleFor } from "@/app/seo";

export const metadata: Metadata = {
  title: titleFor("공유"),
  robots: { index: false, follow: false },
};

export default function DdongMeongSharePage() {
  return (
    <Suspense>
      <DdongMeongShare />
    </Suspense>
  );
}
