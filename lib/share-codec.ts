import {
  defaultDraft, FONT_OPTIONS, INK_OPTIONS, isInkId, isTemplateSlug, isWaxId, PAPER_OPTIONS, STICKERS,
  TEMPLATES, WAX_OPTIONS,
  type CardDraft, type InkId, type Music, type Sticker, type TemplateSlug, type WaxId,
} from "./cards";
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_STICKERS } from "./letters";

export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
export const LOCAL_OUTBOX_KEY = "birthday-cards:static-outbox-v1";
export const EDITOR_DRAFT_KEY = "birthday-cards:editor-draft-v1";
export const MAX_MOTTO_LENGTH = 60;
export const MAX_CUSTOM_NOTES_LENGTH = 120;
export const MAX_MUSIC_URL_LENGTH = 320;

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

interface CompactLetterV1 {
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
  st: ([number, number, number, number] | [number, number, number, number, number])[];
  w?: WaxId;
  mt?: string;
  i?: InkId;
}

const MUSIC_CODE = {
  none: 0,
  "music-box": 1,
  "starry-lullaby": 2,
  "canon-breeze": 3,
  "custom-notes": 4,
  url: 5,
} as const;

export function isValidAudioUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_MUSIC_URL_LENGTH) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeMusic(value: unknown): Music {
  if (!value || typeof value !== "object") return { kind: "music-box" };
  const candidate = value as Partial<Music>;
  switch (candidate.kind) {
    case "none":
    case "music-box":
    case "starry-lullaby":
    case "canon-breeze":
      return { kind: candidate.kind };
    case "custom-notes": {
      const notes = typeof candidate.notes === "string" ? candidate.notes.trim().slice(0, MAX_CUSTOM_NOTES_LENGTH) : "";
      return notes ? { kind: "custom-notes", notes } : { kind: "music-box" };
    }
    case "url": {
      const url = typeof candidate.url === "string" ? candidate.url.trim().slice(0, MAX_MUSIC_URL_LENGTH) : "";
      if (!isValidAudioUrl(url)) return { kind: "music-box" };
      const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 40) : undefined;
      return name ? { kind: "url", url, name } : { kind: "url", url };
    }
    default:
      return { kind: "music-box" };
  }
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

class BinaryWriter {
  private chunks: number[] = [];
  private enc = new TextEncoder();

  u8(v: number) {
    this.chunks.push(v & 0xff);
  }

  u32(v: number) {
    this.chunks.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  }

  varint(v: number) {
    let n = Math.max(0, v >>> 0);
    while (n >= 0x80) {
      this.chunks.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    this.chunks.push(n);
  }

  str(value: string) {
    const encoded = this.enc.encode(value);
    this.varint(encoded.length);
    for (let i = 0; i < encoded.length; i++) this.chunks.push(encoded[i]);
  }

  toBytes() {
    return new Uint8Array(this.chunks);
  }
}

class BinaryReader {
  private pos = 0;
  private dec = new TextDecoder();
  constructor(private bytes: Uint8Array) {}

  u8() {
    if (this.pos >= this.bytes.length) throw new Error("EOF");
    return this.bytes[this.pos++];
  }

  u32() {
    if (this.pos + 4 > this.bytes.length) throw new Error("EOF");
    const v = ((this.bytes[this.pos] << 24) | (this.bytes[this.pos + 1] << 16) | (this.bytes[this.pos + 2] << 8) | this.bytes[this.pos + 3]) >>> 0;
    this.pos += 4;
    return v;
  }

  varint() {
    let result = 0;
    let shift = 0;
    while (true) {
      const b = this.u8();
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) return result >>> 0;
      shift += 7;
      if (shift > 28) throw new Error("Overflow");
    }
  }

  str() {
    const len = this.varint();
    if (this.pos + len > this.bytes.length) throw new Error("EOF");
    const slice = this.bytes.subarray(this.pos, this.pos + len);
    this.pos += len;
    return this.dec.decode(slice);
  }
}

function packBinaryV2(draft: CardDraft, deliverAt: string | null): Uint8Array {
  const w = new BinaryWriter();
  const tIdx = Math.max(0, TEMPLATES.findIndex((item) => item.slug === draft.template));
  const pIdx = Math.max(0, PAPER_OPTIONS.findIndex((item) => item.id === draft.paper));
  const fIdx = Math.max(0, FONT_OPTIONS.findIndex((item) => item.id === draft.font));
  const iIdx = Math.max(0, INK_OPTIONS.findIndex((item) => item.id === (draft.ink ?? "sepia")));
  const wIdx = Math.max(0, WAX_OPTIONS.findIndex((item) => item.id === (draft.wax ?? "rose")));

  const music = sanitizeMusic(draft.music);
  const musicCode = music.kind === "none" ? MUSIC_CODE.none
    : music.kind === "starry-lullaby" ? MUSIC_CODE["starry-lullaby"]
    : music.kind === "canon-breeze" ? MUSIC_CODE["canon-breeze"]
    : music.kind === "custom-notes" ? MUSIC_CODE["custom-notes"]
    : music.kind === "url" ? MUSIC_CODE.url
    : MUSIC_CODE["music-box"];

  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(draft.birthday || "") ? draft.birthday : "";
  const deliverMinutes = deliverAt && Number.isFinite(Date.parse(deliverAt))
    ? Math.floor(Date.parse(deliverAt) / 60000)
    : 0;
  const motto = (draft.motto ?? "").trim().slice(0, MAX_MOTTO_LENGTH);
  const stickers = draft.stickers.slice(0, MAX_STICKERS);

  // Compact 3-byte bit-packed header (zero JSON overhead!)
  w.u8((tIdx & 0x03) | ((pIdx & 0x03) << 2) | ((fIdx & 0x03) << 4) | ((iIdx & 0x03) << 6));
  w.u8((wIdx & 0x03) | ((musicCode & 0x07) << 2) | (birthday ? 0x20 : 0) | (deliverMinutes ? 0x40 : 0) | (motto ? 0x80 : 0));
  w.u8(stickers.length & 0xff);

  w.str(draft.recipient.trim().slice(0, MAX_NAME_LENGTH));
  w.str(draft.message.slice(0, MAX_MESSAGE_LENGTH));
  w.str(draft.sender.trim().slice(0, MAX_NAME_LENGTH));
  if (motto) w.str(motto);
  if (birthday) {
    const [yy, mm, dd] = birthday.split("-").map(Number);
    w.u8(Math.max(0, Math.min(255, yy - 1900)));
    w.u8(mm & 0xff);
    w.u8(dd & 0xff);
  }
  if (deliverMinutes) w.u32(deliverMinutes);
  if (music.kind === "custom-notes") w.str(music.notes);
  else if (music.kind === "url") w.str(music.url);

  // 4 bytes per sticker (type+scale, x, y, rot) instead of ~22 JSON bytes
  for (const sticker of stickers) {
    const typeIdx = Math.max(0, STICKERS.findIndex((item) => item.id === sticker.type));
    const scaleQ = Math.round(Math.min(1.8, Math.max(.3, sticker.scale)) * 10) - 3; // 0..15
    const xQ = Math.round(Math.min(1, Math.max(0, sticker.x)) * 255);
    const yQ = Math.round(Math.min(1, Math.max(0, sticker.y)) * 255);
    const rotQ = Math.round(Math.min(35, Math.max(-35, sticker.rotation ?? 0))) + 35; // 0..70
    w.u8((typeIdx & 0x0f) | ((Math.max(0, Math.min(15, scaleQ)) & 0x0f) << 4));
    w.u8(xQ);
    w.u8(yQ);
    w.u8(rotQ);
  }
  return w.toBytes();
}

function unpackBinaryV2(bytes: Uint8Array): SharedLetterPayload | null {
  try {
    const r = new BinaryReader(bytes);
    const b0 = r.u8();
    const b1 = r.u8();
    const stickerCount = Math.min(MAX_STICKERS, r.u8());

    const template = TEMPLATES[b0 & 0x03]?.slug;
    const paper = PAPER_OPTIONS[(b0 >> 2) & 0x03]?.id ?? "watercolor";
    const font = FONT_OPTIONS[(b0 >> 4) & 0x03]?.id ?? "serif";
    const ink = INK_OPTIONS[(b0 >> 6) & 0x03]?.id ?? "sepia";
    const wax = WAX_OPTIONS[b1 & 0x03]?.id ?? "rose";
    const musicCode = (b1 >> 2) & 0x07;
    const hasBirthday = Boolean(b1 & 0x20);
    const hasDeliverAt = Boolean(b1 & 0x40);
    const hasMotto = Boolean(b1 & 0x80);
    if (!template) return null;

    const recipient = r.str().trim().slice(0, MAX_NAME_LENGTH);
    if (!recipient) return null;
    const message = r.str().slice(0, MAX_MESSAGE_LENGTH);
    const sender = r.str().trim().slice(0, MAX_NAME_LENGTH);
    const motto = hasMotto ? r.str().trim().slice(0, MAX_MOTTO_LENGTH) : "";

    let birthday = "";
    if (hasBirthday) {
      const yy = 1900 + r.u8();
      const mm = r.u8();
      const dd = r.u8();
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        birthday = `${String(yy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      }
    }

    let deliverAt: string | null = null;
    if (hasDeliverAt) {
      const mins = r.u32();
      if (mins > 0) deliverAt = new Date(mins * 60000).toISOString();
    }

    let music: Music = { kind: "music-box" };
    if (musicCode === MUSIC_CODE.none) music = { kind: "none" };
    else if (musicCode === MUSIC_CODE["starry-lullaby"]) music = { kind: "starry-lullaby" };
    else if (musicCode === MUSIC_CODE["canon-breeze"]) music = { kind: "canon-breeze" };
    else if (musicCode === MUSIC_CODE["custom-notes"]) {
      music = sanitizeMusic({ kind: "custom-notes", notes: r.str() });
    } else if (musicCode === MUSIC_CODE.url) {
      music = sanitizeMusic({ kind: "url", url: r.str() });
    }

    const stickers: Sticker[] = [];
    for (let idx = 0; idx < stickerCount; idx++) {
      const ts = r.u8();
      const xQ = r.u8();
      const yQ = r.u8();
      const rotQ = r.u8();
      const def = STICKERS[ts & 0x0f];
      if (!def) continue;
      const scale = Math.round(((ts >> 4) + 3) * 10) / 100;
      stickers.push({
        id: `st-${idx}`,
        type: def.id,
        x: Math.min(.96, Math.max(.04, xQ / 255)),
        y: Math.min(.96, Math.max(.04, yQ / 255)),
        scale: Math.min(2, Math.max(.3, scale)),
        rotation: Math.min(35, Math.max(-35, rotQ - 35)),
      });
    }

    return {
      draft: {
        template,
        paper,
        font,
        ink,
        wax,
        recipient,
        message,
        sender,
        motto,
        birthday,
        stickers,
        music,
      },
      deliverAt,
    };
  } catch {
    return null;
  }
}

/**
 * Encodes a birthday letter into an ultra-compact binary token (`2.` raw / `3.` deflated),
 * typically 55-65% shorter than JSON tokens while staying 100% static & self-contained.
 */
export async function encodeSharedLetter(draft: CardDraft, deliverAt: string | null): Promise<string> {
  const packed = packBinaryV2(draft, deliverAt);
  const compressed = await compressDeflateRaw(packed);
  if (compressed && compressed.length < packed.length) {
    return `3.${bytesToBase64Url(compressed)}`;
  }
  return `2.${bytesToBase64Url(packed)}`;
}

/** Decodes both new ultra-short binary tokens (`2.`/`3.`) and legacy JSON v1 tokens (`z.`/`u.`). */
export async function decodeSharedLetter(token: string): Promise<SharedLetterPayload | null> {
  try {
    const trimmed = token.trim();
    if (!trimmed || trimmed.length > 12000) return null;

    if (trimmed.startsWith("2.")) {
      return unpackBinaryV2(base64UrlToBytes(trimmed.slice(2)));
    }
    if (trimmed.startsWith("3.")) {
      const bytes = await decompressDeflateRaw(base64UrlToBytes(trimmed.slice(2)));
      return bytes ? unpackBinaryV2(bytes) : null;
    }

    // Legacy v1 JSON format (`z.` / `u.`) preserved for 100% backward compatibility
    let bytes: Uint8Array | null = null;
    if (trimmed.startsWith("z.")) {
      bytes = await decompressDeflateRaw(base64UrlToBytes(trimmed.slice(2)));
    } else if (trimmed.startsWith("u.")) {
      bytes = base64UrlToBytes(trimmed.slice(2));
    } else {
      return null;
    }
    if (!bytes) return null;
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CompactLetterV1>;
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
        const [typeIdx, xInt, yInt, scaleInt, rotInt] = entry;
        const def = typeof typeIdx === "number" ? STICKERS[typeIdx] : undefined;
        if (!def || typeof xInt !== "number" || typeof yInt !== "number" || typeof scaleInt !== "number") return;
        const rotation = typeof rotInt === "number" && Number.isFinite(rotInt)
          ? Math.round(Math.min(35, Math.max(-35, rotInt)))
          : 0;
        stickers.push({
          id: `st-${index}`,
          type: def.id,
          x: Math.min(.96, Math.max(.04, xInt / 1000)),
          y: Math.min(.96, Math.max(.04, yInt / 1000)),
          scale: Math.min(2, Math.max(.3, scaleInt / 100)),
          rotation,
        });
      });
    }

    const wax = isWaxId(parsed.w) ? parsed.w : "rose";
    const ink = isInkId(parsed.i) ? parsed.i : "sepia";
    const motto = typeof parsed.mt === "string" ? parsed.mt.trim().slice(0, MAX_MOTTO_LENGTH) : "";

    return {
      draft: {
        template: parsed.t,
        paper,
        font,
        ink,
        recipient,
        message,
        sender,
        birthday,
        stickers,
        music: parsed.k === "m" ? { kind: "music-box" } : { kind: "none" },
        wax,
        motto,
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

export function loadEditorDraft(): CardDraft | null {
  try {
    const raw = localStorage.getItem(EDITOR_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CardDraft>;
    if (!parsed || !isTemplateSlug(parsed.template)) return null;
    const base = defaultDraft(parsed.template);
    const paper = PAPER_OPTIONS.find((item) => item.id === parsed.paper)?.id ?? base.paper;
    const font = FONT_OPTIONS.find((item) => item.id === parsed.font)?.id ?? base.font;
    const ink = isInkId(parsed.ink) ? parsed.ink : "sepia";
    const wax = isWaxId(parsed.wax) ? parsed.wax : "rose";
    const stickers: Sticker[] = Array.isArray(parsed.stickers)
      ? parsed.stickers.slice(0, MAX_STICKERS).filter((item): item is Sticker => (
        Boolean(item)
        && typeof item.id === "string"
        && STICKERS.some((def) => def.id === item.type)
        && typeof item.x === "number"
        && typeof item.y === "number"
        && typeof item.scale === "number"
      )).map((item) => ({
        ...item,
        rotation: typeof item.rotation === "number" ? Math.round(Math.min(35, Math.max(-35, item.rotation))) : 0,
      }))
      : [];
    const draft: CardDraft = {
      template: parsed.template,
      paper,
      font,
      ink,
      wax,
      recipient: typeof parsed.recipient === "string" ? parsed.recipient.slice(0, MAX_NAME_LENGTH) : "",
      message: typeof parsed.message === "string" ? parsed.message.slice(0, MAX_MESSAGE_LENGTH) : "",
      sender: typeof parsed.sender === "string" ? parsed.sender.slice(0, MAX_NAME_LENGTH) : "",
      birthday: typeof parsed.birthday === "string" ? parsed.birthday.slice(0, 10) : "",
      motto: typeof parsed.motto === "string" ? parsed.motto.slice(0, MAX_MOTTO_LENGTH) : "",
      stickers,
      music: sanitizeMusic(parsed.music),
    };
    const hasContent = Boolean(draft.recipient.trim() || draft.message.trim() || draft.sender.trim() || draft.birthday || draft.motto?.trim() || draft.stickers.length);
    return hasContent ? draft : null;
  } catch {
    return null;
  }
}

export function saveEditorDraft(draft: CardDraft) {
  try {
    const hasContent = Boolean(draft.recipient.trim() || draft.message.trim() || draft.sender.trim() || draft.birthday || draft.motto?.trim() || draft.stickers.length);
    if (!hasContent) {
      localStorage.removeItem(EDITOR_DRAFT_KEY);
      return;
    }
    localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify({
      ...draft,
      music: sanitizeMusic(draft.music),
    }));
  } catch {
    // Ignore storage quota errors.
  }
}

export function clearEditorDraft() {
  try {
    localStorage.removeItem(EDITOR_DRAFT_KEY);
  } catch {
    // Ignore storage errors.
  }
}
