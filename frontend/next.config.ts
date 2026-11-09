import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emit /dashboard/index.html rather than dashboard.html: the backend serves the export with
  // express.static, which redirects /dashboard to /dashboard/ because the RSC payload directory exists.
  trailingSlash: true,
  distDir: "out",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
