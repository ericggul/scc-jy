import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/4",
        destination: "/",
        permanent: true,
      },
      {
        source: "/4/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/ddong-meong",
        destination: "/",
        permanent: true,
      },
      {
        source: "/ddong-meong/:path*",
        destination: "/:path*",
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
