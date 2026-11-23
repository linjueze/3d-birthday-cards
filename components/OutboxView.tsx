"use client";

import { CakeSlice, Copy, Flower2, Gift, LockKeyhole, Mail, MoonStar, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TEMPLATES } from "@/lib/cards";
import type { OutboxLetter } from "@/lib/letters";
import { Brand, copyText, rememberOutbox, useToast } from "./Shared";
import styles from "./OutboxView.module.css";

const templateIcons = {
  "candlelight-cake": CakeSlice,
  "starry-wish": MoonStar,
  "bloom-garden": Flower2,
  "confetti-atelier": Gift,
};

const timestamp = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const preciseTimestamp = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  dateStyle: "medium",
  timeStyle: "long",
});

function formatTime(date: string) {
  const parts = Object.fromEntries(timestamp.formatToParts(new Date(date)).map(({ type, value }) => [type, value]));
  return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export default function OutboxView({ token }: { token: string }) {
  const [letters, setLetters] = useState<OutboxLetter[] | null>(null);
  const [error, setError] = useState("");
  const { notify, toast } = useToast();
  const apiPath = `/api/outbox/${encodeURIComponent(token)}`;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(apiPath, { cache: "no-store", signal });
      const data = await response.json() as { letters?: OutboxLetter[]; error?: string };
      if (!response.ok || !data.letters) throw new Error(data.error || "寄件箱暂时无法查看。");
      if (!signal?.aborted) {
        setLetters(data.letters);
        setError("");
      }
    } catch (failure) {
      if (!signal?.aborted) {
        setError(failure instanceof Error && failure.name !== "TypeError"
          ? failure.message
          : "暂时连接不上，稍后会自动重试。");
      }
    }
  }, [apiPath]);

  useEffect(() => {
    let controller: AbortController | null = null;
    function sync() {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      void refresh(controller.signal);
    }
    sync();
    const interval = window.setInterval(sync, 5000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [refresh]);

  async function copyLetter(id: string) {
    try {
      await copyText(new URL(`/letter/${encodeURIComponent(id)}`, window.location.href).href);
      notify("收件链接已复制");
    } catch {
      notify("暂时无法复制链接，请再试一次");
    }
  }

  return (
    <main className={styles.page}>
      <header className={`site-header ${styles.header}`}>
        <Brand />
        <Link className={`pill pill-primary ${styles.newLetter}`} href="/editor" onClick={() => { if (letters) rememberOutbox(token); }}>
          <Plus size={17} aria-hidden="true" /> 再写一封
        </Link>
      </header>

      <section className={styles.outbox} aria-labelledby="outbox-title">
        <header className={styles.intro}>
          <span className={styles.emblem}><Mail size={26} strokeWidth={1.45} aria-hidden="true" /></span>
          <h1 id="outbox-title">寄件箱</h1>
          <p><LockKeyhole size={14} aria-hidden="true" /> 只有知道这个链接的人能看到这里。</p>
        </header>

        {letters?.length ? (
          <ul className={styles.list} aria-label="已寄出的生日信">
            {letters.map((letter) => {
              const template = TEMPLATES.find((item) => item.slug === letter.template);
              const Icon = templateIcons[letter.template];
              return (
                <li key={letter.id} className={styles.row}>
                  <span className={`${styles.cover} ${styles[letter.template]}`} aria-hidden="true"><Icon size={18} strokeWidth={1.5} /></span>
                  <div className={styles.address}>
                    <p className={styles.recipient}>寄给 {letter.recipient}</p>
                    <p className={styles.detail}>
                      <span>{template?.name}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={letter.createdAt}>{formatTime(letter.createdAt)} 寄出</time>
                    </p>
                  </div>
                  <div className={styles.openState}>
                    <span className={`${styles.status} ${letter.openedAt ? styles.opened : ""}`}>
                      <span aria-hidden="true" />{letter.openedAt ? "已拆封" : "未拆封"}
                    </span>
                    {letter.openedAt && (
                      <time dateTime={letter.openedAt} title={preciseTimestamp.format(new Date(letter.openedAt))}>
                        {formatTime(letter.openedAt)} 拆开
                      </time>
                    )}
                  </div>
                  <button type="button" className={`pill pill-outline ${styles.copy}`} aria-label={`复制链接，寄给 ${letter.recipient}`} onClick={() => { void copyLetter(letter.id); }}>
                    <Copy size={15} aria-hidden="true" /><span>复制链接</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty} role="status">
            <p>{error || (letters ? "寄件箱里还没有寄出的生日信。" : "正在读取寄件箱…")}</p>
            {error && <button type="button" className="pill pill-outline" onClick={() => { setError(""); void refresh(); }}>重新读取</button>}
          </div>
        )}

        {letters?.length && error ? <p className={styles.refreshError} role="status">{error}</p> : null}
      </section>
      {toast}
    </main>
  );
}
