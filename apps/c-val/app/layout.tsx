import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "C-VAL",
  description: "A versioned multi-device V/A/L financial-market artwork.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
