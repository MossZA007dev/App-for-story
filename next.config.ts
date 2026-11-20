import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "better-sqlite3"],
  async rewrites(){return {fallback:[{source:"/images/:filename",destination:"/api/images/:filename"}]};},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  allowedDevOrigins: ["*.trycloudflare.com"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
