"use client";

import { CakeSlice, Coffee, Copy, ExternalLink, Flower2, Gift, Heart, LockKeyhole, Mail, MoonStar, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TEMPLATES } from "@/lib/cards";
import { deleteLocalOutboxItem, loadLocalOutbox, withBasePath, type LocalOutboxItem } from "@/lib/share-codec";
import { Brand, copyText, useToast } from "./Shared";
import styles from "./OutboxView.module.css";

const templateIcons = {
  "candlelight-cake": CakeSlice,
  "starry-wish": MoonStar,
  "bloom-garden": Flower2,
  "confetti-atelier": Gift,
  "sakura-mail": Mail,
  "teddy-birthday": Heart,
  "atelier-tea": Coffee,
};

const timestamp = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatTime(date: string) {
  const parts = Object.fromEntries(timestamp.formatToParts(new Date(date)).map(({ type, value }) => [type, value]));
  return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export default function OutboxView() {
  const [letters, setLetters] = useState<LocalOutboxItem[] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { notify, toast } = useToast();

  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = window.setTimeout(() => setConfirmDeleteId(null), 3500);
    return () => window.clearTimeout(timer);
  }, [confirmDeleteId]);

  useEffect(() => {
    const sync = () => setLetters(loadLocalOutbox());
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function copyLetter(sharePath: string) {
    try {
      const fullUrl = new URL(withBasePath(sharePath), window.location.origin).href;
      await copyText(fullUrl);
      notify("收件链接已复制");
    } catch {
      notify("暂时无法复制链接，请再试一次");
    }
  }

  function removeLetter(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    setLetters(deleteLocalOutboxItem(id));
    notify("已从本机寄件箱移除");
  }

  return (
    <main className={styles.page}>
      <header className={`site-header ${styles.header}`}>
        <Brand />
        <Link className={`pill pill-primary ${styles.newLetter}`} href="/editor">
          <Plus size={17} aria-hidden="true" /> 再写一封
        </Link>
      </header>

      <section className={styles.outbox} aria-labelledby="outbox-title">
        <header className={styles.intro}>
          <span className={styles.emblem}><Mail size={26} strokeWidth={1.45} aria-hidden="true" /></span>
          <h1 id="outbox-title">寄件箱</h1>
          <p><LockKeyhole size={14} aria-hidden="true" /> 纯静态版记录保存在当前浏览器，可随时复制分享链接。</p>
        </header>

        {letters?.length ? (
          <ul className={styles.list} aria-label="已生成的生日信">
            {letters.map((letter) => {
              const template = TEMPLATES.find((item) => item.slug === letter.template);
              const Icon = templateIcons[letter.template];
              const scheduled = Boolean(letter.deliverAt && Date.parse(letter.deliverAt) > Date.now());
              return (
                <li key={letter.id} className={styles.row}>
                  <span className={`${styles.cover} ${styles[letter.template]}`} aria-hidden="true"><Icon size={18} strokeWidth={1.5} /></span>
                  <div className={styles.address}>
                    <p className={styles.recipient}>寄给 {letter.recipient}</p>
                    <p className={styles.detail}>
                      <span className={styles.templateTag}>{template?.name}</span>
                      <time dateTime={letter.createdAt}>{formatTime(letter.createdAt)} 生成</time>
                    </p>
                  </div>
                  <div className={styles.openState}>
                    <span className={`${styles.status} ${scheduled ? "" : styles.opened}`}>
                      <span aria-hidden="true" />{scheduled ? "定时开启" : "已可拆信"}
                    </span>
                    {letter.deliverAt && (
                      <time dateTime={letter.deliverAt}>{formatTime(letter.deliverAt)} 开启</time>
                    )}
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" className={`pill pill-outline ${styles.copy}`} aria-label={`复制链接，寄给 ${letter.recipient}`} onClick={() => { void copyLetter(letter.sharePath); }}>
                      <Copy size={15} aria-hidden="true" /><span>复制链接</span>
                    </button>
                    <Link className={`pill pill-quiet ${styles.previewBtn}`} href={letter.sharePath} target="_blank" rel="noreferrer" aria-label={`打开预览，寄给 ${letter.recipient}`} title="打开预览">
                      <ExternalLink size={15} aria-hidden="true" /><span>预览</span>
                    </Link>
                    <button
                      type="button"
                      className={confirmDeleteId === letter.id ? `pill pill-outline ${styles.deleteConfirm}` : `icon-btn ${styles.deleteBtn}`}
                      aria-label={confirmDeleteId === letter.id ? `确认删除记录，寄给 ${letter.recipient}` : `删除记录，寄给 ${letter.recipient}`}
                      title={confirmDeleteId === letter.id ? "再次点击确认删除" : "从本机移除"}
                      onClick={() => removeLetter(letter.id)}
                    >
                      <Trash2 size={15} />{confirmDeleteId === letter.id && <span>确认删除</span>}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.empty} role="status">
            <p>{letters ? "本机寄件箱里还没有生成过的生日信。" : "正在读取寄件箱…"}</p>
          </div>
        )}
      </section>
      {toast}
    </main>
  );
}
