import type { Metadata } from "next";
import { Suspense } from "react";
import Editor from "@/components/Editor";

export const metadata: Metadata = { title: "制作贺卡" };

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
