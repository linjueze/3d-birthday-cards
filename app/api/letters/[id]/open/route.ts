import { letterFailure, letterResponse } from "@/lib/letter-http";
import { openLetter } from "@/lib/letter-store";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const letter = await openLetter((await params).id);
    return letter
      ? letterResponse(letter)
      : letterResponse({ error: "找不到这封生日信，请检查收件链接。" }, 404);
  } catch (error) {
    return letterFailure(error);
  }
}
