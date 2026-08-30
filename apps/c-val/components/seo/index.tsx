import type { Metadata } from "next";

export const cValSiteUrl = "https://c-val.vercel.app";
export const cValPreviewImage = "/image/main.png";

const cValTitle = "C-VAL — 한국 금융시장을 조율하는 인터랙티브 웹 아트 | Jeanyoon Choi";
const cValDescription =
  "〈C-VAL〉은 최정윤(Jeanyoon Choi)의 다기기 인터랙티브 웹 아트워크입니다. 관람객의 휴대폰 움직임이 변동성·거래 활동·유동성을 변화시켜 모의 한국 금융시장의 주문·체결·가격 형성에 개입합니다.";

const cValKeywords = [
  "C-VAL",
  "CVAL",
  "씨발",
  "Conducting Volatility Activity Liquidity",
  "Jeanyoon Choi",
  "최정윤",
  "interactive web artwork",
  "interactive art",
  "media art",
  "new media art",
  "Korean contemporary art",
  "Korean financial market",
  "한국 금융시장",
  "한국 주식시장",
  "금융시장 시뮬레이션",
  "주문장",
  "연속 경매",
  "관객 참여형 작품",
  "다기기 웹 아트",
  "스마트폰 인터랙션",
  "변동성",
  "유동성",
];

export const cValRootMetadata: Metadata = {
  metadataBase: new URL(cValSiteUrl),
  applicationName: "C-VAL",
  authors: [{ name: "Jeanyoon Choi", url: cValSiteUrl }],
  creator: "Jeanyoon Choi",
  publisher: "Jeanyoon Choi",
  verification: {
    google: "B0jfZSkwl0hWTiIrI55oMZVEJsgE_1n6TR55ErHtL5I",
  },
};

export const cValHomeMetadata: Metadata = {
  title: cValTitle,
  description: cValDescription,
  keywords: cValKeywords,
  alternates: { canonical: "/" },
  category: "Interactive art",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US"],
    siteName: "C-VAL",
    title: cValTitle,
    description: cValDescription,
    url: "/",
    images: [
      {
        url: cValPreviewImage,
        width: 3840,
        height: 2160,
        alt: "C-VAL의 모의 시장에서 주문, 체결, 가격 형성이 네 화면으로 펼쳐진 모습",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: cValTitle,
    description: cValDescription,
    images: [cValPreviewImage],
  },
};

export const cValMobileMetadata: Metadata = {
  title: "C-VAL 모바일 참여",
  description:
    "휴대폰의 움직임으로 C-VAL의 변동성, 거래 활동, 유동성 조건을 바꾸어 모의 시장의 주문과 체결에 참여합니다.",
  alternates: { canonical: "/mobile" },
  robots: { index: false, follow: false },
};

const cValStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${cValSiteUrl}/#website`,
      name: "C-VAL",
      url: `${cValSiteUrl}/`,
      inLanguage: ["ko-KR", "en"],
      creator: {
        "@type": "Person",
        "@id": `${cValSiteUrl}/#jeanyoon-choi`,
        name: "Jeanyoon Choi",
        alternateName: "최정윤",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${cValSiteUrl}/#webpage`,
      url: `${cValSiteUrl}/`,
      name: cValTitle,
      description: cValDescription,
      inLanguage: "ko-KR",
      isPartOf: { "@id": `${cValSiteUrl}/#website` },
      mainEntity: { "@id": `${cValSiteUrl}/#artwork` },
    },
    {
      "@type": ["VisualArtwork", "CreativeWork"],
      "@id": `${cValSiteUrl}/#artwork`,
      name: "C-VAL",
      alternateName: "Conducting Volatility, Activity, Liquidity",
      url: `${cValSiteUrl}/`,
      image: `${cValSiteUrl}${cValPreviewImage}`,
      description: cValDescription,
      inLanguage: ["ko-KR", "en"],
      artform: "Interactive web artwork",
      genre: ["Interactive art", "Media art", "Web art"],
      keywords: cValKeywords.join(", "),
      creator: { "@id": `${cValSiteUrl}/#jeanyoon-choi` },
      about: [
        {
          "@type": "Thing",
          name: "Korean financial market",
          alternateName: ["한국 금융시장", "한국 주식시장"],
        },
        {
          "@type": "Thing",
          name: "Agent-based market simulation",
        },
        {
          "@type": "Thing",
          name: "Audience participation",
          alternateName: "관객 참여",
        },
      ],
    },
  ],
};

export function CValStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(cValStructuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
