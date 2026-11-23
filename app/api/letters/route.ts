import { letterFailure, letterResponse } from "@/lib/letter-http";
import { readLetterInput } from "@/lib/letter-input";
import { sendLetter } from "@/lib/letter-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return letterResponse(await sendLetter(await readLetterInput(request)), 201);
  } catch (error) {
    return letterFailure(error);
  }
}
