import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function SnsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="sns-viewport-lock">{children}</div>;
}
