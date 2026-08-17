import type { Metadata } from "next";

export const siteUrl = "https://ddong-meong.vercel.app";
export const pageTitle = "똥멍: 똥싸며 멍때리기";
export const pageDescription =
  "똥멍은 화장실에서 잠깐 멍때리는 시간을 위한 유머러스한 인터랙티브 배변 명상 웹앱입니다. 급똥, 모닝똥, 변비처럼 일상의 순간을 4분 33초 콘텐츠로 만납니다.";
export const previewImage = "/meditations/thick-poop-imagination.png";

const keywords = [
  "똥멍",
  "똥싸며 멍때리기",
  "똥 메디테이션",
  "똥 명상",
  "화장실 명상",
  "배변 명상",
  "급똥",
  "모닝똥",
  "변비",
  "인터랙티브 아트",
  "인터랙티브 웹 프로젝트",
  "speculative design",
  "최정윤",
  "Jeanyoon Choi",
  "ddong-meong",
];

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: pageDescription,
  applicationName: "똥멍",
  authors: [{ name: "Jeanyoon Choi" }],
  creator: "Jeanyoon Choi",
  publisher: "Jeanyoon Choi",
  verification: {
    google: "B0jfZSkwl0hWTiIrI55oMZVEJsgE_1n6TR55ErHtL5I",
    other: {
      "naver-site-verification": "ffa195929957c5ed1eeac9846dd331d06b72b1a8",
    },
  },
  keywords,
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "똥멍",
    title: pageTitle,
    description: pageDescription,
    url: "/",
    images: [
      {
        url: previewImage,
        width: 1672,
        height: 941,
        alt: "변기 위에 놓인 갈색의 과장된 조형물이 있는 똥멍 명상 장면",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [previewImage],
  },
};

export function titleFor(contentTitle?: string) {
  return contentTitle
    ? `${pageTitle} — ${contentTitle}`
    : pageTitle;
}

export const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "똥멍",
  alternateName: ["ddong-meong", "똥싸며 멍때리기", "똥 메디테이션"],
  url: siteUrl,
  image: `${siteUrl}${previewImage}`,
  inLanguage: "ko-KR",
  applicationCategory: "EntertainmentApplication",
  applicationSubCategory: "Interactive art and satirical meditation",
  operatingSystem: "Web",
  description: pageDescription,
  creator: {
    "@type": "Person",
    name: "Jeanyoon Choi",
    alternateName: "최정윤",
  },
  about: [
    { "@type": "Thing", name: "인터랙티브 아트" },
    { "@type": "Thing", name: "Speculative design" },
    { "@type": "Thing", name: "화장실에서의 짧은 멍때리기" },
  ],
};
