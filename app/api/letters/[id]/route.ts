import { letterFailure, letterResponse } from "@/lib/letter-http";
import { getEnvelope } from "@/lib/letter-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const envelope = await getEnvelope((await params).id);
    return envelope
      ? letterResponse(envelope)
      : letterResponse({ error: "找不到这封生日信，请检查收件链接。" }, 404);
  } catch (error) {
    return letterFailure(error);
  }
}
