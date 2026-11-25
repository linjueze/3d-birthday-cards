import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/caveat/500.css";
import "@fontsource/long-cang/400.css";
import "@fontsource/noto-serif-sc/500.css";
import "./globals.css";
import { withBasePath } from "@/lib/share-codec";

const SITE_ORIGIN = "https://linjueze.github.io";
const SHARE_IMAGE = `${SITE_ORIGIN}${withBasePath("/og-share.jpg")}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: "Birthday Cards · 生日信", template: "%s · Birthday Cards" },
  description: "挑一张立体纸艺贺卡，写下祝福，盖上火漆，把心意寄给重要的人。",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Birthday Cards · 生日信",
    title: "Birthday Cards · 把生日写成一封 3D 信",
    description: "挑一张立体烫金纸艺贺卡，写下祝福，亲手盖上火漆寄给重要的人。",
    images: [{ url: SHARE_IMAGE, width: 1200, height: 630, alt: "Birthday Cards · 3D 立体纸艺生日贺卡" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Birthday Cards · 把生日写成一封 3D 信",
    description: "挑一张立体烫金纸艺贺卡，写下祝福，亲手盖上火漆寄给重要的人。",
    images: [SHARE_IMAGE],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preload" as="image" href={withBasePath("/assets/cards/candlelight-cake/base.webp")} fetchPriority="high" />
      </head>
      <body>{children}</body>
    </html>
  );
}
