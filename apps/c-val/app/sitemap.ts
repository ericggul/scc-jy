import type { MetadataRoute } from "next";
import { cValSiteUrl } from "@/components/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: cValSiteUrl,
      lastModified: new Date("2026-08-28T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 1,
      images: [`${cValSiteUrl}/image/main.png`],
    },
  ];
}
