"use client";

import { AlignLeft, BookHeart, BookOpen, Clock3, LockKeyhole, MailOpen, Rotate3D, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultDraft, type CardDraft } from "@/lib/cards";
import type { LetterEnvelope, OpenedLetter } from "@/lib/letters";
import CardScene from "./CardScene";
import { Brand, Stars, useMusic, useToast } from "./Shared";
import styles from "./LetterReader.module.css";

type Scene = "sealed" | "breaking" | "opened";

interface EnvelopeClock {
  envelope: LetterEnvelope;
  serverOffset: number;
}

function remainingLabel(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const counter = [hours, minutes, seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
  return days ? `${days} 天 ${counter}` : counter;
}

const deliveryFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default function LetterReader({ id }: { id: string }) {
  const [clock, setClock] = useState<EnvelopeClock | null>(null);
  const [time, setTime] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [scene, setScene] = useState<Scene>("sealed");
  const [requesting, setRequesting] = useState(false);
  const [draft, setDraft] = useState<CardDraft>(() => defaultDraft());
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const hasOpenedCard = useRef(false);
  const openRequest = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDialogElement>(null);
  const { playing, toggle } = useMusic(draft.music);
  const { notify, toast } = useToast();
  const apiPath = useMemo(() => `/api/letters/${encodeURIComponent(id)}`, [id]);

  const refreshEnvelope = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(apiPath, { cache: "no-store", signal });
      const result = await response.json() as LetterEnvelope & { error?: string };
      if (!response.ok) throw new Error(result.error || "这封信暂时无法读取。");
      const now = Date.now();
      setTime(now);
      setClock({ envelope: result, serverOffset: Date.parse(result.serverTime) - now });
      setLoadError("");
    } catch (error) {
      if (!signal?.aborted) {
        setLoadError(error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "暂时连接不上，等一会儿再打开这封信。");
      }
    }
  }, [apiPath]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshEnvelope(controller.signal);
    return () => {
      controller.abort();
      openRequest.current?.abort();
    };
  }, [refreshEnvelope]);

  const deliverAt = clock?.envelope.deliverAt;
  const remaining = deliverAt && clock
    ? Math.max(0, Math.ceil((Date.parse(deliverAt) - time - clock.serverOffset) / 1000))
    : 0;
  const locked = remaining > 0;
  useEffect(() => {
    if (!locked) return;
    const tick = () => setTime(Date.now());
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [locked]);

  async function breakSeal() {
    if (!clock || locked || scene !== "sealed" || requesting || openRequest.current) return;
    const controller = new AbortController();
    openRequest.current = controller;
    setRequesting(true);
    try {
      const response = await fetch(`${apiPath}/open`, { method: "POST", signal: controller.signal });
      const result = await response.json() as OpenedLetter & { error?: string };
      if (!response.ok) {
        if (response.status === 423) void refreshEnvelope(controller.signal);
        throw new Error(result.error || "这封信暂时无法拆开。");
      }
      setDraft(result.draft);
      setScene("breaking");
    } catch (error) {
      if (!controller.signal.aborted) {
        notify(error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "暂时连接不上，等一会儿再拆信。");
      }
    } finally {
      if (openRequest.current === controller) openRequest.current = null;
      if (!controller.signal.aborted) setRequesting(false);
    }
  }

  const extractionComplete = useCallback(() => {
    setScene((current) => current === "breaking" ? "opened" : current);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(false), 2600);
    return () => window.clearTimeout(timer);
  }, [burst]);

  function toggleCard() {
    if (scene !== "opened") return;
    setOpen(!open);
    if (!open && !hasOpenedCard.current) {
      hasOpenedCard.current = true;
      setBurst(true);
    }
  }

  const recipient = clock?.envelope.recipient;
  const canBreak = scene === "sealed" && !locked && !requesting;
  const stageTitle = !clock ? "生日信" : scene === "opened" ? `Dear ${recipient}` : `给 ${recipient} 的生日信`;

  return (
    <main className={styles.page}>
      <header className={`site-header ${styles.header}`}>
        <Brand />
        <span className={styles.headerNote}><MailOpen size={15} aria-hidden="true" /> 一封生日信</span>
      </header>

      {loadError && !clock ? (
        <section className={styles.unavailable} aria-labelledby="letter-title">
          <span className={styles.emptyIcon}><MailOpen size={29} strokeWidth={1.35} aria-hidden="true" /></span>
          <h1 id="letter-title">这封信暂时找不到</h1>
          <p>{loadError}</p>
          <div className={styles.controls}>
            <button className="pill pill-outline" onClick={() => { setLoadError(""); void refreshEnvelope(); }}>重新读取</button>
            <Link className="pill pill-primary" href="/">回到画廊</Link>
          </div>
        </section>
      ) : (
        <section className={styles.experience} aria-labelledby="letter-title">
          <div className={styles.title}>
            <h1 id="letter-title">{stageTitle}</h1>
            <p>{locked ? "一封祝福正在等它的时刻。" : scene === "opened"
              ? "把这份小小的生日心意收好。"
              : "愿这一岁，多一点可爱的惊喜。"}</p>
          </div>

          <div className={styles.stage}>
            <Stars className={styles.stardust} />
            {burst && <Stars className={styles.stardust} burst />}
            <CardScene
              className={styles.cardScene}
              draft={draft}
              mode="letter"
              envelope={scene}
              open={open}
              onToggle={toggleCard}
              onReady={extractionComplete}
            />
            {clock && scene === "sealed" && !locked && (
              <button
                type="button"
                className={styles.waxTarget}
                aria-label="点火漆拆信"
                disabled={!canBreak}
                onClick={breakSeal}
              />
            )}
          </div>

          <div className={styles.actions}>
            {!clock ? (
              <p className={styles.hint} role="status">正在找到你的信…</p>
            ) : locked ? (
              <div className={styles.countdown} aria-label="距离送达">
                <span className={styles.lockIcon}><LockKeyhole size={17} aria-hidden="true" /></span>
                <div>
                  <p className={styles.countdownDate}>将在 {deliveryFormat.format(new Date(deliverAt!))} 开启</p>
                  <time className={styles.counter} dateTime={`PT${remaining}S`}>{remainingLabel(remaining)}</time>
                </div>
              </div>
            ) : scene === "sealed" ? (
              <button type="button" className={`pill pill-primary ${styles.openButton}`} disabled={!canBreak} onClick={breakSeal}>
                <MailOpen size={17} aria-hidden="true" />
                {requesting ? "正在拆信…" : "点一下火漆，拆开这封生日信"}
              </button>
            ) : scene === "breaking" ? (
              <p className={styles.hint} role="status"><Clock3 size={15} aria-hidden="true" /> 正在展开生日信…</p>
            ) : (
              <div className={styles.readControls}>
                <div className={styles.controls}>
                  <button type="button" className="pill pill-primary" aria-expanded={open} onClick={toggleCard}>
                    {open ? <BookHeart size={17} aria-hidden="true" /> : <BookOpen size={17} aria-hidden="true" />}
                    {open ? "合上贺卡" : "翻开贺卡"}
                  </button>
                  {draft.music.kind !== "none" && (
                    <button type="button" className="pill pill-outline" aria-pressed={playing} onClick={toggle}>
                      {playing ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
                      {playing ? "关闭音乐" : "播放音乐"}
                    </button>
                  )}
                  {open && (
                    <button type="button" className="pill pill-outline" onClick={() => transcript.current?.showModal()}>
                      <AlignLeft size={17} aria-hidden="true" /> 文字版
                    </button>
                  )}
                </div>
                <p className={styles.hint}><Rotate3D size={15} aria-hidden="true" /> 拖动贺卡，看看纸页的光影</p>
              </div>
            )}
          </div>

          {open && scene === "opened" && (
            <dialog ref={transcript} className={styles.transcript} aria-labelledby="transcript-title">
              <form method="dialog" className={styles.transcriptClose}>
                <button type="submit" className="pill pill-outline" aria-label="关闭文字版"><X size={19} aria-hidden="true" /></button>
              </form>
              <article>
                <h2 id="transcript-title">Dear {draft.recipient}</h2>
                <p className={styles.transcriptBody}>{draft.message}</p>
                {draft.sender && <p>— {draft.sender}</p>}
                {draft.birthday && <time dateTime={draft.birthday}>{draft.birthday}</time>}
              </article>
            </dialog>
          )}
        </section>
      )}
      {toast}
    </main>
  );
}
