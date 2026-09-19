import { createSerwistRoute } from "@serwist/turbopack";

// Versions the precached offline page per build so a new deploy replaces it.
const revision = crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    useNativeEsbuild: true,
  });
