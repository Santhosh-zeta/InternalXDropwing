import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
