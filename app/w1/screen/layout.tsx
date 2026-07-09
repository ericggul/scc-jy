import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "w1 screen",
};

export default function W1ScreenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
