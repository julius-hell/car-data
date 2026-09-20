import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Meta");
  return {
    name: t("appName"),
    short_name: t("appName"),
    description: t("description"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf8",
    theme_color: "#2a78d6",
    shortcuts: [
      {
        name: t("logShortcut"),
        short_name: t("logShortcut"),
        description: t("logShortcutDescription"),
        url: "/log",
        icons: [{ src: "/icons/shortcut-log.png", sizes: "96x96", type: "image/png" }],
      },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
