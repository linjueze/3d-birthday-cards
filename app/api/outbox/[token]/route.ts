import { letterFailure, letterResponse } from "@/lib/letter-http";
import { getOutbox } from "@/lib/letter-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const letters = await getOutbox((await params).token);
    return letters
      ? letterResponse({ letters })
      : letterResponse({ error: "找不到这个寄件箱，请检查私密链接。" }, 404);
  } catch (error) {
    return letterFailure(error);
  }
}
