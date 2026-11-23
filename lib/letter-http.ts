import { LetterInputError } from "./letter-input";

const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export function letterResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

export function letterFailure(error: unknown) {
  if (error instanceof LetterInputError) {
    return letterResponse({ error: error.message }, error.status);
  }
  return letterResponse({ error: "信件暂时无法读取或保存，请稍后再试。" }, 500);
}
