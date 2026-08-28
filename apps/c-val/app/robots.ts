import type { MetadataRoute } from "next";
import { cValSiteUrl } from "@/components/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/controller", "/screen", "/whole", "/reset"],
    },
    host: cValSiteUrl,
    sitemap: `${cValSiteUrl}/sitemap.xml`,
  };
}
