import type { Metadata } from "next";
import QrPosterGenerator from "@/components/qr-generator/screen";
import {
  qrPosterParametersFromQuery,
  type QrPosterQuery,
} from "@/components/qr-generator/model/parameters";
import { titleFor } from "../seo";

export const metadata: Metadata = {
  title: titleFor("QR 포스터 생성"),
  robots: { index: false, follow: false },
};

export default async function QrGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<QrPosterQuery>;
}) {
  return (
    <QrPosterGenerator
      initialParameters={qrPosterParametersFromQuery(await searchParams)}
    />
  );
}
