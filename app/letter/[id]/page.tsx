import type { Metadata } from "next";
import LetterReader from "@/components/LetterReader";

export const metadata: Metadata = {
  title: "给你的生日信",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LetterReader key={id} id={id} />;
}
