import type { CardDraft } from "./cards";
import { MAX_AUDIO_BYTES } from "./cards";

export interface SendLetterInput {
  draft: CardDraft;
  deliverAt: string | null;
  outboxToken?: string;
  requestId?: string;
}

export interface SentLetter {
  id: string;
  outboxToken: string;
  recipientPath: string;
  outboxPath: string;
}

export interface LetterEnvelope {
  id: string;
  recipient: string;
  deliverAt: string | null;
  openedAt: string | null;
  serverTime: string;
  locked: boolean;
}

export interface OpenedLetter {
  id: string;
  draft: CardDraft;
  openedAt: string;
}

export interface OutboxLetter {
  id: string;
  recipient: string;
  template: CardDraft["template"];
  createdAt: string;
  deliverAt: string | null;
  openedAt: string | null;
}

export const MAX_LETTER_REQUEST_BYTES = Math.ceil(MAX_AUDIO_BYTES / 3) * 4 + 180 * 1024;
export const MAX_NAME_LENGTH = 60;
export const MAX_MESSAGE_LENGTH = 1200;
export const MAX_STICKERS = 50;
