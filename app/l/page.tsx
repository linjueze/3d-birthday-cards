import type { Metadata } from "next";
import { Suspense } from "react";
import LetterReader from "@/components/LetterReader";

export const metadata: Metadata = {
  title: "拆开生日信",
  description: "拆开火漆，读一封为你写下的 3D 生日信。",
};

export default function ShortLetterPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#76655f" }}>正在展开你的生日信…</main>}>
      <LetterReader />
    </Suspense>
  );
}
