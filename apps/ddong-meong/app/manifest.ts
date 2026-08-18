import type { MetadataRoute } from "next";
import { pageDescription } from "./seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "똥멍",
    short_name: "똥멍",
    description: "똥싸며 명상하기 · 4분 33초 똥멍 콘텐츠",
    start_url: "/",
    display: "standalone",
    background_color: "#352116",
    theme_color: "#352116",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
