import GoogleAnalytics from "@/components/analytics/google-analytics";

export default function DdongMeongMobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <GoogleAnalytics />
    </>
  );
}
