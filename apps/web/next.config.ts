import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@promptflow/core", "@promptflow/ui"],
};

export default nextConfig;
