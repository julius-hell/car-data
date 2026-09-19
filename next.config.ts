import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Photo uploads: 15 MB file plus multipart overhead.
      bodySizeLimit: "16mb",
    },
  },
};

export default withSerwist(nextConfig);
