import path from "node:path";
import type { NextConfig } from "next";

// Anchor Turbopack to this project, not a parent folder that may contain
// another package-lock.json (for example, E:\\Projects).
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
