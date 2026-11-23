import {
  FONT_OPTIONS, isTemplateSlug, PAPER_OPTIONS, STICKERS,
  type CardDraft, type Sticker, type TemplateSlug,
} from "./cards";
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_STICKERS } from "./letters";

export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
export const LOCAL_OUTBOX_KEY = "birthday-cards:static-outbox-v1";

export function withBasePath(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}

export interface SharedLetterPayload {
  draft: CardDraft;
  deliverAt: string | null;
}

export interface LocalOutboxItem {
  id: string;
  recipient: string;
  template: TemplateSlug;
  createdAt: string;
  deliverAt: string | null;
  sharePath: string;
}

interface CompactLetter {
  v: 1;
  t: TemplateSlug;
  p: CardDraft["paper"];
  f: CardDraft["font"];
  r: string;
  m: string;
  s: string;
  b: string;
  k: "m" | "";
  d: string;
  st: [number, number, number, number][];
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function compressDeflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function decompressDeflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function encodeSharedLetter(draft: CardDraft, deliverAt: string | null): Promise<string> {
  const compact: CompactLetter = {
    v: 1,
    t: draft.template,
    p: draft.paper,
    f: draft.font,
    r: draft.recipient.trim().slice(0, MAX_NAME_LENGTH),
    m: draft.message.slice(0, MAX_MESSAGE_LENGTH),
    s: draft.sender.trim().slice(0, MAX_NAME_LENGTH),
    b: draft.birthday || "",
    k: draft.music.kind === "music-box" ? "m" : "",
    d: deliverAt || "",
    st: draft.stickers.slice(0, MAX_STICKERS).map((sticker) => {
      const idx = Math.max(0, STICKERS.findIndex((item) => item.id === sticker.type));
      return [
        idx,
        Math.round(Math.min(1, Math.max(0, sticker.x)) * 1000),
        Math.round(Math.min(1, Math.max(0, sticker.y)) * 1000),
        Math.round(Math.min(2, Math.max(.3, sticker.scale)) * 100),
      ];
    }),
  };

  const raw = new TextEncoder().encode(JSON.stringify(compact));
  const compressed = await compressDeflateRaw(raw);
  if (compressed && compressed.length < raw.length) {
    return `z.${bytesToBase64Url(compressed)}`;
  }
  return `u.${bytesToBase64Url(raw)}`;
}

export async function decodeSharedLetter(token: string): Promise<SharedLetterPayload | null> {
  try {
    const trimmed = token.trim();
    if (!trimmed || trimmed.length > 12000) return null;
    let bytes: Uint8Array | null = null;
    if (trimmed.startsWith("z.")) {
      bytes = await decompressDeflateRaw(base64UrlToBytes(trimmed.slice(2)));
    } else if (trimmed.startsWith("u.")) {
      bytes = base64UrlToBytes(trimmed.slice(2));
    } else {
      return null;
    }
    if (!bytes) return null;
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CompactLetter>;
    if (!parsed || parsed.v !== 1 || !isTemplateSlug(parsed.t)) return null;
    const paper = PAPER_OPTIONS.find((item) => item.id === parsed.p)?.id ?? "watercolor";
    const font = FONT_OPTIONS.find((item) => item.id === parsed.f)?.id ?? "serif";
    const recipient = typeof parsed.r === "string" ? parsed.r.trim().slice(0, MAX_NAME_LENGTH) : "";
    if (!recipient) return null;
    const message = typeof parsed.m === "string" ? parsed.m.slice(0, MAX_MESSAGE_LENGTH) : "";
    const sender = typeof parsed.s === "string" ? parsed.s.trim().slice(0, MAX_NAME_LENGTH) : "";
    const birthday = typeof parsed.b === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.b) ? parsed.b : "";
    const deliverAt = typeof parsed.d === "string" && parsed.d && Number.isFinite(Date.parse(parsed.d))
      ? new Date(parsed.d).toISOString()
      : null;

    const stickers: Sticker[] = [];
    if (Array.isArray(parsed.st)) {
      parsed.st.slice(0, MAX_STICKERS).forEach((entry, index) => {
        if (!Array.isArray(entry) || entry.length < 4) return;
        const [typeIdx, xInt, yInt, scaleInt] = entry;
        const def = typeof typeIdx === "number" ? STICKERS[typeIdx] : undefined;
        if (!def || typeof xInt !== "number" || typeof yInt !== "number" || typeof scaleInt !== "number") return;
        stickers.push({
          id: `st-${index}`,
          type: def.id,
          x: Math.min(.96, Math.max(.04, xInt / 1000)),
          y: Math.min(.96, Math.max(.04, yInt / 1000)),
          scale: Math.min(2, Math.max(.3, scaleInt / 100)),
        });
      });
    }

    return {
      draft: {
        template: parsed.t,
        paper,
        font,
        recipient,
        message,
        sender,
        birthday,
        stickers,
        music: parsed.k === "m" ? { kind: "music-box" } : { kind: "none" },
      },
      deliverAt,
    };
  } catch {
    return null;
  }
}

export function loadLocalOutbox(): LocalOutboxItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_OUTBOX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item): item is LocalOutboxItem => (
      Boolean(item)
      && typeof item.id === "string"
      && typeof item.recipient === "string"
      && isTemplateSlug(item.template)
      && typeof item.createdAt === "string"
      && typeof item.sharePath === "string"
    ));
  } catch {
    return [];
  }
}

export function saveLocalOutboxItem(item: LocalOutboxItem): LocalOutboxItem[] {
  const next = [item, ...loadLocalOutbox().filter((existing) => existing.id !== item.id)].slice(0, 60);
  try {
    localStorage.setItem(LOCAL_OUTBOX_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors; share link is already displayed.
  }
  return next;
}

export function deleteLocalOutboxItem(id: string): LocalOutboxItem[] {
  const next = loadLocalOutbox().filter((item) => item.id !== id);
  try {
    localStorage.setItem(LOCAL_OUTBOX_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors.
  }
  return next;
}
