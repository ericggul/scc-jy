import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/goldfishes/3d/1",
        destination: "/goldfishes/default",
        permanent: true,
      },
      {
        source: "/goldfishes/3d/2",
        destination: "/goldfishes/0804/tube",
        permanent: true,
      },
      {
        source: "/goldfishes/3d/3",
        destination: "/goldfishes/0804/pillars",
        permanent: true,
      },
      {
        source: "/goldfishes/0804/1",
        destination: "/goldfishes/0804/tube",
        permanent: true,
      },
      {
        source: "/goldfishes/0804/2",
        destination: "/goldfishes/0804/pillars",
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
