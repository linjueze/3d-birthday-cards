import type { Metadata } from "next";
import LetterReader from "@/components/LetterReader";

export const metadata: Metadata = {
  title: "给你的生日信",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function LetterPage() {
  return <LetterReader />;
}
