import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "w1 mobile",
};

export default function W1MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
