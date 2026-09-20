import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    applicationName: t("appName"),
    title: {
      default: t("appName"),
      template: `%s · ${t("appName")}`,
    },
    description: t("description"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("appName"),
    },
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0c" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <SerwistProvider swUrl="/serwist/sw.js" options={{ scope: "/" }}>
            {children}
          </SerwistProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
