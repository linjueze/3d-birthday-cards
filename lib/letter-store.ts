import { createHash, randomBytes } from "node:crypto";
import { link, mkdir, mkdtemp, opendir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { CardDraft } from "./cards";
import { isLetterId, isOutboxToken, LetterInputError } from "./letter-input";
import type { LetterEnvelope, OpenedLetter, OutboxLetter, SendLetterInput, SentLetter } from "./letters";

interface StoredLetter extends Omit<OutboxLetter, "openedAt"> {
  outboxToken: string;
  requestHash: string | null;
}

const directory = resolve(process.env.BIRTHDAY_DATA_DIR || ".data", "letters");

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return null;
    throw error;
  }
}

function readRecord(id: string) {
  return readJson<StoredLetter>(join(directory, id, "envelope.json"));
}

function readOpened(id: string) {
  return readJson<string>(join(directory, id, "opened.json"));
}

async function* records(): AsyncGenerator<StoredLetter> {
  let folders;
  try {
    folders = await opendir(directory);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return;
    throw error;
  }
  for await (const folder of folders) {
    if (!folder.isDirectory() || !isLetterId(folder.name)) continue;
    const letter = await readRecord(folder.name);
    if (letter) yield letter;
  }
}

function sentResult(letter: StoredLetter): SentLetter {
  return {
    id: letter.id,
    outboxToken: letter.outboxToken,
    recipientPath: `/letter/${letter.id}`,
    outboxPath: `/outbox/${letter.outboxToken}`,
  };
}

function getRetryResult(letter: StoredLetter, requestHash: string | null): SentLetter {
  if (!requestHash || letter.requestHash !== requestHash) {
    throw new LetterInputError("这次寄送的内容已经改变，请重新封装后寄出。", 409);
  }
  return sentResult(letter);
}

async function outboxExists(token: string): Promise<boolean> {
  for await (const letter of records()) {
    if (letter.outboxToken === token) return true;
  }
  return false;
}

export async function sendLetter({ draft, deliverAt, outboxToken, requestId }: SendLetterInput): Promise<SentLetter> {
  const id = requestId
    ? createHash("sha256").update(`birthday-letter:${requestId.toLowerCase()}`).digest().subarray(0, 18).toString("base64url")
    : randomBytes(18).toString("base64url");
  const requestHash = requestId
    ? createHash("sha256").update(JSON.stringify({ draft, deliverAt, outboxToken })).digest("base64url")
    : null;
  if (requestId) {
    const existing = await readRecord(id);
    if (existing) return getRetryResult(existing, requestHash);
  }
  if (deliverAt && Date.parse(deliverAt) <= Date.now()) {
    throw new LetterInputError("请选择未来的送达日期。");
  }
  if (outboxToken && !(await outboxExists(outboxToken))) {
    throw new LetterInputError("寄件箱链接无效。", 404);
  }

  const letter: StoredLetter = {
    id,
    recipient: draft.recipient,
    template: draft.template,
    outboxToken: outboxToken || randomBytes(32).toString("base64url"),
    requestHash,
    createdAt: new Date().toISOString(),
    deliverAt,
  };
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const pending = await mkdtemp(join(directory, ".pending-"));
  try {
    const writes = await Promise.allSettled([
      writeFile(join(pending, "envelope.json"), JSON.stringify(letter), { mode: 0o600 }),
      writeFile(join(pending, "draft.json"), JSON.stringify(draft), { mode: 0o600 }),
    ]);
    for (const write of writes) {
      if (write.status === "rejected") throw write.reason;
    }
    await rename(pending, join(directory, id));
  } catch (error) {
    if (requestId) {
      const existing = await readRecord(id);
      if (existing) return getRetryResult(existing, requestHash);
    }
    throw error;
  } finally {
    await rm(pending, { recursive: true, force: true });
  }
  return sentResult(letter);
}

function deliveryLocked(deliverAt: string | null, now: Date) {
  return deliverAt !== null && Date.parse(deliverAt) > now.getTime();
}

export async function getEnvelope(id: string): Promise<LetterEnvelope | null> {
  if (!isLetterId(id)) return null;
  const letter = await readRecord(id);
  if (!letter) return null;
  const openedAt = await readOpened(id);
  const serverTime = new Date();
  return {
    id,
    recipient: letter.recipient,
    deliverAt: letter.deliverAt,
    openedAt,
    serverTime: serverTime.toISOString(),
    locked: deliveryLocked(letter.deliverAt, serverTime),
  };
}

async function markOpened(id: string): Promise<string> {
  const existing = await readOpened(id);
  if (existing) return existing;
  const openedAt = new Date().toISOString();
  const folder = join(directory, id);
  const pending = join(folder, `.${randomBytes(12).toString("hex")}.open.tmp`);
  const marker = join(folder, "opened.json");
  await writeFile(pending, JSON.stringify(openedAt), { flag: "wx", mode: 0o600 });
  try {
    // Atomic create-if-absent keeps the first timestamp across parallel requests.
    await link(pending, marker);
    return openedAt;
  } catch (error) {
    if (hasErrorCode(error, "EEXIST")) {
      const first = await readOpened(id);
      if (first) return first;
    }
    throw error;
  } finally {
    await rm(pending, { force: true });
  }
}

export async function openLetter(id: string): Promise<OpenedLetter | null> {
  if (!isLetterId(id)) return null;
  const letter = await readRecord(id);
  if (!letter) return null;
  if (deliveryLocked(letter.deliverAt, new Date())) {
    throw new LetterInputError("还未到约定的送达时间。", 423);
  }
  const draft = await readJson<CardDraft>(join(directory, id, "draft.json"));
  if (!draft) throw new Error("Missing stored letter draft");
  return { id, draft, openedAt: await markOpened(id) };
}

export async function getOutbox(token: string): Promise<OutboxLetter[] | null> {
  if (!isOutboxToken(token)) return null;
  const letters: OutboxLetter[] = [];
  for await (const letter of records()) {
    if (letter.outboxToken !== token) continue;
    const { id, recipient, template, createdAt, deliverAt } = letter;
    letters.push({ id, recipient, template, createdAt, deliverAt, openedAt: await readOpened(id) });
  }
  if (!letters.length) return null;
  return letters.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
