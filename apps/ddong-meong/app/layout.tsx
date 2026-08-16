import type { Metadata } from "next";
import GoogleAnalytics from "@/components/analytics/google-analytics";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import { siteMetadata, structuredData } from "./seo";
import "./globals.css";

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
