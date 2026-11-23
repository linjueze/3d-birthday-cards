import { Buffer } from "node:buffer";
import { FONT_OPTIONS, isTemplateSlug, MAX_AUDIO_BYTES, PAPER_OPTIONS, STICKERS, type CardDraft, type Sticker } from "./cards";
import {
  MAX_LETTER_REQUEST_BYTES,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_STICKERS,
  type SendLetterInput,
} from "./letters";

export class LetterInputError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function isLetterId(value: string): boolean {
  return /^[A-Za-z0-9_-]{24}$/.test(value);
}

export function isOutboxToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LetterInputError("这封信的格式有误，请返回编辑页再试一次。");
  }
  return value as Record<string, unknown>;
}

function field(value: unknown, maxLength: number, message: string): string {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new LetterInputError(message);
  }
  return value;
}

function coordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function parseStickers(value: unknown): Sticker[] {
  if (!Array.isArray(value) || value.length > MAX_STICKERS) {
    throw new LetterInputError("一封信最多可放 50 枚贴纸。");
  }
  const ids = new Set<string>();
  return value.map((item) => {
    const { id, type, x, y, scale } = record(item);
    const sticker = STICKERS.find((option) => option.id === type);
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(id) || ids.has(id) || !sticker ||
        !coordinate(x) || !coordinate(y) || typeof scale !== "number" ||
        !Number.isFinite(scale) || scale < 0.25 || scale > 3) {
      throw new LetterInputError("有一枚贴纸的位置或大小有误，请重新摆放。");
    }
    ids.add(id);
    return { id, type: sticker.id, x, y, scale };
  });
}

function detectAudioType(audio: Buffer): string | null {
  if (audio.length >= 12 && audio.toString("ascii", 0, 4) === "RIFF" && audio.toString("ascii", 8, 12) === "WAVE") {
    return "audio/wav";
  }
  if (audio.length >= 12 && audio.toString("ascii", 4, 8) === "ftyp") {
    return "audio/mp4";
  }
  if (audio.length >= 4 && (audio.toString("ascii", 0, 3) === "ID3" ||
      (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0))) {
    return "audio/mpeg";
  }
  return null;
}

function parseMusic(value: unknown): CardDraft["music"] {
  const music = record(value);
  if (music.kind === "none" || music.kind === "music-box") return { kind: music.kind };
  if (music.kind !== "upload" || typeof music.data !== "string") {
    throw new LetterInputError("请选择八音盒或上传 MP3、WAV、M4A 音频。");
  }
  const name = field(music.name, 240, "音频文件名太长了。").trim();
  const format = /\.(mp3|wav|m4a)$/i.exec(name)?.[1].toLowerCase();
  const separator = music.data.indexOf(",");
  const descriptor = separator > 0 ? music.data.slice(0, separator) : "";
  const encoded = music.data.slice(separator + 1);
  if (!format || !/^data:(?:audio\/[a-z0-9.+-]+|application\/octet-stream)?;base64$/i.test(descriptor) ||
      !encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new LetterInputError("音频格式有误，请上传 MP3、WAV 或 M4A 文件。");
  }
  if (encoded.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4) {
    throw new LetterInputError("音频需在 15 MB 以内。", 413);
  }
  const audio = Buffer.from(encoded, "base64");
  if (audio.length > MAX_AUDIO_BYTES) {
    throw new LetterInputError("音频需在 15 MB 以内。", 413);
  }
  const mime = detectAudioType(audio);
  const expected = format === "mp3" ? "audio/mpeg" : format === "wav" ? "audio/wav" : "audio/mp4";
  if (!mime || mime !== expected) {
    throw new LetterInputError("无法识别音频内容，请确认文件与扩展名一致。");
  }
  return { kind: "upload", name, data: `data:${mime};base64,${encoded}` };
}

function parseDraft(value: unknown): CardDraft {
  const draft = record(value);
  const paper = PAPER_OPTIONS.find((option) => option.id === draft.paper);
  const font = FONT_OPTIONS.find((option) => option.id === draft.font);
  if (typeof draft.template !== "string" || !isTemplateSlug(draft.template) || !paper || !font) {
    throw new LetterInputError("请重新选择这封信的贺卡主题、纸张和字体。");
  }
  const recipient = field(draft.recipient, MAX_NAME_LENGTH, "收件人名字最多 60 个字符。").trim();
  if (!recipient) {
    throw new LetterInputError("在「Dear」后面写上 TA 的名字，寄件箱里靠它区分每一封");
  }
  const birthday = field(draft.birthday, 10, "请输入有效的生日日期。");
  if (birthday) {
    const stamp = new Date(`${birthday}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || Number.isNaN(stamp.getTime()) ||
        stamp.toISOString().slice(0, 10) !== birthday) {
      throw new LetterInputError("请输入有效的生日日期。");
    }
  }
  return {
    template: draft.template,
    paper: paper.id,
    font: font.id,
    recipient,
    message: field(draft.message, MAX_MESSAGE_LENGTH, "祝福正文最多 1200 个字符。"),
    sender: field(draft.sender, MAX_NAME_LENGTH, "落款最多 60 个字符。").trim(),
    birthday,
    stickers: parseStickers(draft.stickers),
    music: parseMusic(draft.music),
  };
}

export function parseLetterInput(value: unknown): SendLetterInput {
  const input = record(value);
  let deliverAt: string | null = null;
  if (input.deliverAt !== null && input.deliverAt !== undefined) {
    if (typeof input.deliverAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.deliverAt)) {
      throw new LetterInputError("请选择有效的送达日期。");
    }
    const date = new Date(input.deliverAt);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== input.deliverAt) {
      throw new LetterInputError("请选择有效的送达日期。");
    }
    deliverAt = date.toISOString();
  }
  const outboxToken = input.outboxToken;
  if (outboxToken !== undefined && !isOutboxToken(outboxToken)) {
    throw new LetterInputError("寄件箱链接无效。", 404);
  }
  const requestId = input.requestId;
  if (requestId !== undefined && (typeof requestId !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId))) {
    throw new LetterInputError("这封信的请求编号有误，请返回编辑页重试。");
  }
  return { draft: parseDraft(input.draft), deliverAt, outboxToken, requestId };
}

export async function readLetterInput(request: Request): Promise<SendLetterInput> {
  if (request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new LetterInputError("这封信的请求格式有误。", 415);
  }
  const sizeError = () => new LetterInputError("这封信太大了，自定义音频需在 15 MB 以内。", 413);
  if (Number(request.headers.get("Content-Length")) > MAX_LETTER_REQUEST_BYTES) throw sizeError();
  const reader = request.body?.getReader();
  if (!reader) throw new LetterInputError("这封信还是空的。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_LETTER_REQUEST_BYTES) {
        await reader.cancel().catch(() => {});
        throw sizeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch {
    throw new LetterInputError("这封信的格式有误，请再试一次。");
  }
  return parseLetterInput(value);
}
