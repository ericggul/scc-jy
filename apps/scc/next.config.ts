import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/finger-skating/1/mobile",
        destination: "/finger-skating/default/1/mobile",
        permanent: true,
      },
      {
        source: "/finger-skating/1/screen",
        destination: "/finger-skating/default/1/screen",
        permanent: true,
      },
      {
        source: "/finger-skating/2/mobile",
        destination: "/finger-skating/default/2/mobile",
        permanent: true,
      },
      {
        source: "/finger-skating/2/screen",
        destination: "/finger-skating/default/2/screen",
        permanent: true,
      },
      {
        source: "/cellular-automata/:experiment(1|2|3|4|5|6)",
        destination: "/cellular-automata/colour/:experiment",
        permanent: true,
      },
    ];
  },
  allowedDevOrigins: ["macbook-air-5.local"],
  devIndicators: false,
  compiler: {
    styledComponents: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
