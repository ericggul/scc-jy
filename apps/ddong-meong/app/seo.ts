import type { Metadata } from "next";

export const siteUrl = "https://ddong-meong.vercel.app";
export const pageTitle = "똥멍 — 똥 싸는 시간을 멍때리는 시간으로";
export const pageDescription =
  "똥멍은 똥 싸는 시간을 잠깐 멍때리는 시간으로 바꾸는 모바일 웹 경험입니다. 오늘의 똥멍 콘텐츠를 골라 4분 33초 동안 읽고 듣습니다.";
export const previewImage = "/meditations/thick-poop-imagination.png";

const keywords = [
  "똥멍",
  "똥멍 앱",
  "똥싸며 명상하기",
  "똥싸며 멍때리기",
  "똥싸고 멍때리기",
  "멍때리기",
  "멍때리기 앱",
  "명상 앱",
  "유머 명상 앱",
  "짧은 명상",
  "4분 33초 명상",
  "똥 명상",
  "화장실 명상",
  "화장실에서 하는 명상",
  "화장실에서 멍때리기",
  "똥 메디테이션",
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
  category: "Entertainment",
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/google-search-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
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
    ? `${contentTitle} | 똥멍`
    : pageTitle;
}

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "똥멍",
      alternateName: [
        "똥싸며 명상하기",
        "똥싸며 멍때리기",
        "ddong-meong",
        "ddong-meong.vercel.app",
      ],
      url: `${siteUrl}/`,
      inLanguage: "ko-KR",
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#app`,
      name: "똥멍",
      alternateName: ["똥싸며 명상하기", "똥싸며 멍때리기", "ddong-meong"],
      url: siteUrl,
      isPartOf: { "@id": `${siteUrl}/#website` },
      image: `${siteUrl}${previewImage}`,
      logo: `${siteUrl}/google-search-icon.png`,
      inLanguage: "ko-KR",
      applicationCategory: "EntertainmentApplication",
      applicationSubCategory: "Meditation app",
      operatingSystem: "Web",
      description: pageDescription,
      keywords,
      creator: {
        "@type": "Person",
        name: "Jeanyoon Choi",
        alternateName: "최정윤",
      },
      about: [
        {
          "@type": "Thing",
          name: "명상 앱",
          alternateName: ["명상하기", "짧은 명상", "유머 명상"],
        },
        {
          "@type": "Thing",
          name: "멍때리기",
          alternateName: ["멍때리기 앱", "화장실에서 멍때리기", "똥싸며 멍때리기"],
        },
        {
          "@type": "Thing",
          name: "똥싸며 명상하기",
          alternateName: ["화장실 명상", "똥 명상", "똥 메디테이션"],
        },
        { "@type": "Thing", name: "인터랙티브 아트" },
        { "@type": "Thing", name: "Speculative design" },
        { "@type": "Thing", name: "화장실에서의 짧은 멍때리기" },
      ],
    },
  ],
};
