"use client";

import Link from "next/link";
import { CakeSlice, Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { OUTBOX_KEY, OUTBOX_TOKEN_PATTERN, type Music } from "@/lib/cards";
import { isSfxMuted } from "@/lib/sfx";

export function Brand({ className = "" }: { className?: string }) {
  return <Link href="/" className={`brand ${className}`} aria-label="Birthday Cards · 生日信，返回首页">
    <span className="brand-icon"><CakeSlice size={20} strokeWidth={1.55} /></span>
    <span className="brand-copy"><strong>Birthday Cards</strong><span>生日信</span></span>
  </Link>;
}

export function useToast() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMessage("");
  }, []);
  const notify = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(value);
    timer.current = setTimeout(dismiss, 4200);
  }, [dismiss]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const toast = <div className="toast-layer" role="status" aria-live="polite" aria-atomic="true">
    {message && <div className="toast"><Check size={17} /><span>{message}</span><button type="button" className="icon-btn" aria-label="关闭提示" onClick={dismiss}><X size={16} /></button></div>}
  </div>;
  return { notify, toast };
}

export function savedOutbox(): string | null {
  try {
    const token = localStorage.getItem(OUTBOX_KEY);
    return token && OUTBOX_TOKEN_PATTERN.test(token) ? token : null;
  } catch { return null; }
}

export function rememberOutbox(token: string | null) {
  try {
    if (token) localStorage.setItem(OUTBOX_KEY, token);
    else localStorage.removeItem(OUTBOX_KEY);
  } catch { /* The share panel still contains the link. */ }
}

export async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(value); return; } catch { /* Try selection-based copy. */ }
  }
  const previousFocus = document.activeElement;
  const field = document.createElement("textarea");
  field.value = value;
  field.readOnly = true;
  field.style.cssText = "position:fixed;left:0;top:0;opacity:0;pointer-events:none";
  document.body.append(field);
  field.select();
  field.setSelectionRange(0, value.length);
  try {
    if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
}

const MELODIES = {
  "music-box": [
    [60, .57], [60, .29], [62, .85], [60, .85], [65, .85], [64, 1.6],
    [60, .57], [60, .29], [62, .85], [60, .85], [67, .85], [65, 1.6],
    [60, .57], [60, .29], [72, .85], [69, .85], [65, .85], [64, .85], [62, 1.6],
    [70, .57], [70, .29], [69, .85], [65, .85], [67, .85], [65, 2.1],
  ],
  "starry-lullaby": [
    [60, .68], [60, .68], [67, .68], [67, .68], [69, .68], [69, .68], [67, 1.36],
    [65, .68], [65, .68], [64, .68], [64, .68], [62, .68], [62, .68], [60, 1.36],
    [67, .68], [67, .68], [65, .68], [65, .68], [64, .68], [64, .68], [62, 1.36],
    [67, .68], [67, .68], [65, .68], [65, .68], [64, .68], [64, .68], [62, 1.45],
  ],
  "canon-breeze": [
    [64, 1.05], [62, 1.05], [60, 1.05], [59, 1.05], [57, 1.05], [55, 1.05], [57, 1.05], [59, 1.05],
    [67, .52], [64, .52], [67, .52], [72, .52], [71, .52], [67, .52], [69, .52], [64, .52],
    [65, .52], [60, .52], [64, .52], [67, .52], [65, .52], [69, .52], [67, 1.55],
  ],
} as const;

const SCALE_SEMITONES: Record<string, number> = {
  "1": 0, "2": 2, "3": 4, "4": 5, "5": 7, "6": 9, "7": 11,
};

/** Parses numbered notation like `1 1 5 5 6 6 5 - 1'` into MIDI note/duration pairs. */
export function parseCustomNotes(raw: string): [number, number][] {
  const tokens = raw.trim().split(/[\s,|/]+/).filter(Boolean);
  const result: [number, number][] = [];
  for (const token of tokens) {
    if (token === "-" || token === "0" || token === ".") {
      if (result.length && token === "-") {
        result[result.length - 1][1] += .42;
      } else {
        result.push([0, .42]);
      }
      continue;
    }
    const match = token.match(/^([1-7])([#b]?)([',]*)$/);
    if (!match) continue;
    const [, degree, accidental, oct] = match;
    let midi = 60 + SCALE_SEMITONES[degree];
    if (accidental === "#") midi += 1;
    else if (accidental === "b") midi -= 1;
    for (const ch of oct) {
      if (ch === "'") midi += 12;
      else if (ch === ",") midi -= 12;
    }
    result.push([Math.max(48, Math.min(84, midi)), .52]);
    if (result.length >= 48) break;
  }
  return result;
}

export function previewNoteKey(token: string) {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const parsed = parseCustomNotes(token);
  const note = parsed[0]?.[0];
  if (!note) return;
  try {
    const ctx = new AudioContext();
    void ctx.resume().then(() => {
      bell(ctx, note + 12, ctx.currentTime + .01, .085);
      setTimeout(() => { if (ctx.state !== "closed") void ctx.close().catch(() => {}); }, 900);
    }).catch(() => { if (ctx.state !== "closed") void ctx.close().catch(() => {}); });
  } catch { /* Audio unavailable */ }
}

function bell(context: AudioContext, note: number, when: number, volume: number) {
  const fundamental = 440 * 2 ** ((note - 69) / 12);
  for (const [multiple, amplitude, release] of [[1, .64, 1.25], [2.01, .22, .64], [3.98, .105, .33], [6.79, .035, .16]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = fundamental * multiple;
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume * amplitude, when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + release);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(when);
    oscillator.stop(when + release + .02);
  }
}

export function prepareSealSound() {
  if (!window.AudioContext) return null;
  try {
    const context = new AudioContext();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const dispose = () => {
      clearTimeout(timer);
      if (context.state !== "closed") void context.close().catch(() => {});
    };
    void context.resume().catch(dispose);
    return {
      play() {
        if (context.state !== "running") { dispose(); return; }
        bell(context, 53, context.currentTime + .02, .09);
        bell(context, 77, context.currentTime + .085, .025);
        timer = setTimeout(dispose, 1500);
      },
      dispose,
    };
  } catch { return null; }
}

export function playWaxCrackSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = new AudioContext();
    void context.resume().then(() => {
      const now = context.currentTime + .01;
      const len = Math.floor(context.sampleRate * .07);
      const buf = context.createBuffer(1, len, context.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * .22));
      }
      const noise = context.createBufferSource();
      noise.buffer = buf;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1850;
      filter.Q.value = 1.8;
      const gain = context.createGain();
      gain.gain.setValueAtTime(.18, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .075);
      noise.connect(filter).connect(gain).connect(context.destination);
      noise.start(now);
      bell(context, 72, now + .04, .035);
      bell(context, 79, now + .11, .025);
      setTimeout(() => { if (context.state !== "closed") void context.close().catch(() => {}); }, 1400);
    }).catch(() => { if (context.state !== "closed") void context.close().catch(() => {}); });
  } catch { /* Audio unavailable */ }
}

export function playPaperOpenSound() {
  if (typeof window === "undefined" || !window.AudioContext || isSfxMuted()) return;
  try {
    const context = new AudioContext();
    void context.resume().then(() => {
      const now = context.currentTime + .01;
      const dur = .24;
      const len = Math.floor(context.sampleRate * dur);
      const buf = context.createBuffer(1, len, context.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.sin(Math.PI * t) * Math.pow(1 - t, .65);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = context.createBufferSource();
      noise.buffer = buf;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(920, now);
      filter.frequency.exponentialRampToValueAtTime(2100, now + dur * .65);
      filter.Q.value = .95;
      const gain = context.createGain();
      gain.gain.setValueAtTime(.065, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + dur);
      noise.connect(filter).connect(gain).connect(context.destination);
      noise.start(now);
      setTimeout(() => { if (context.state !== "closed") void context.close().catch(() => {}); }, 600);
    }).catch(() => { if (context.state !== "closed") void context.close().catch(() => {}); });
  } catch { /* Audio unavailable */ }
}

export function useMusic(music: Music) {
  const [playing, setPlaying] = useState(false);
  const player = useRef<{ context?: AudioContext; audio?: HTMLAudioElement; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const cleanup = useCallback(() => {
    const current = player.current;
    if (!current) return;
    player.current = null;
    clearTimeout(current.timer);
    if (current.audio) { current.audio.pause(); current.audio.removeAttribute("src"); }
    if (current.context && current.context.state !== "closed") void current.context.close();
  }, []);
  const stop = useCallback(() => { cleanup(); setPlaying(false); }, [cleanup]);
  useEffect(() => () => cleanup(), [cleanup]);
  useEffect(() => { stop(); }, [music, stop]);

  const start = useCallback(() => {
    if (player.current || music.kind === "none") return;
    if (music.kind === "upload" || music.kind === "url") {
      const src = music.kind === "upload" ? music.data : music.url;
      const audio = new Audio(src);
      audio.volume = .6;
      audio.loop = true;
      player.current = { audio };
      audio.addEventListener("error", () => { if (player.current?.audio === audio) stop(); }, { once: true });
      void audio.play().then(() => { if (player.current?.audio === audio) setPlaying(true); }).catch(() => {
        if (player.current?.audio === audio) stop();
      });
      return;
    }

    const sequence: readonly (readonly [number, number])[] = music.kind === "custom-notes"
      ? parseCustomNotes(music.notes)
      : MELODIES[music.kind];
    if (!sequence.length || !window.AudioContext) return;
    const context = new AudioContext();
    player.current = { context };
    const playPhrase = () => {
      if (player.current?.context !== context) return;
      let at = context.currentTime + .07;
      sequence.forEach(([note, duration], index) => {
        if (note > 0) {
          bell(context, note + 12, at, .075);
          if (index % 3 === 0) {
            bell(context, note - 12, at + .045, .02);
          }
        }
        at += duration;
      });
      player.current.timer = setTimeout(playPhrase, (at - context.currentTime + .75) * 1000);
    };
    void context.resume().then(() => {
      if (player.current?.context !== context) return;
      setPlaying(true);
      playPhrase();
    }).catch(() => { if (player.current?.context === context) stop(); });
  }, [music, stop]);

  const toggle = useCallback(() => {
    if (player.current) { stop(); return; }
    start();
  }, [start, stop]);
  return { playing, start, toggle, stop };
}

export function Stars({ burst = false, className = "" }: { burst?: boolean; className?: string }) {
  const particles = Array.from({ length: burst ? 34 : 18 }, (_, index) => {
    const angle = index * 2.39996;
    const distance = 100 + (index * 53 % 340);
    return <i key={index} style={{
      "--x": `${(index * 71 + 11) % 100}%`,
      "--delay": `${burst ? index * 12 : -(index * 1543 % 22000)}ms`,
      "--duration": `${burst ? 1300 + index * 37 % 850 : 14000 + index * 1139 % 13000}ms`,
      "--dx": `${(Math.cos(angle) * distance).toFixed(2)}px`,
      "--dy": `${(Math.sin(angle) * distance * .65).toFixed(2)}px`,
      "--size": `${index % 5 === 0 ? 5 : index % 3 === 0 ? 3 : 2}px`,
    } as CSSProperties} />;
  });
  return <div className={`stars ${burst ? "stars-burst" : ""} ${className}`} aria-hidden="true">{particles}</div>;
}
