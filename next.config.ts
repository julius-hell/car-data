import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSerwist(nextConfig);
