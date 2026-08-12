import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/goldfishes",
        destination: "/",
        permanent: false,
      },
      {
        source: "/goldfishes/:path*",
        destination: "/:path*",
        permanent: false,
      },
      {
        source: "/3d/1",
        destination: "/default",
        permanent: true,
      },
      {
        source: "/3d/2",
        destination: "/0804/tube",
        permanent: true,
      },
      {
        source: "/3d/3",
        destination: "/0804/pillars",
        permanent: true,
      },
      {
        source: "/0804/1",
        destination: "/0804/tube",
        permanent: true,
      },
      {
        source: "/0804/2",
        destination: "/0804/pillars",
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
};

export default nextConfig;
