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

export const metadata: Metadata = {
  title: { default: "Birthday Cards · 生日信", template: "%s · Birthday Cards" },
  description: "挑一张立体纸艺贺卡，写下祝福，盖上火漆，把心意寄给重要的人。",
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
