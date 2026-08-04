import localFont from "next/font/local";

export const ddongMeongSans = localFont({
  src: "../assets/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-ddong-meong",
  fallback: ["system-ui", "sans-serif"],
});
