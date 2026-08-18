import type { MetadataRoute } from "next";
import { mobileMeditationContents } from "@/components/mobile/content/registry";
import { previewImage, siteUrl } from "./seo";

const lastModified = new Date("2026-08-18T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/main`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...mobileMeditationContents.map((meditation) => ({
      url: `${siteUrl}/${meditation.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [`${siteUrl}${previewImage}`],
    })),
  ];
}
