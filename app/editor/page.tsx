import type { Metadata } from "next";
import Editor from "@/components/Editor";
import { isTemplateSlug } from "@/lib/cards";

export const metadata: Metadata = { title: "制作贺卡" };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  return <Editor initialTemplate={isTemplateSlug(template) ? template : undefined} />;
}
