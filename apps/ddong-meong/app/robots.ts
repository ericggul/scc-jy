import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/screen", "/testing", "/testing/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
