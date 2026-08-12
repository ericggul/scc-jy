import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "ddong-meong",
  description: "A mobile meditation and live archive artwork.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
