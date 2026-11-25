"use client";

import { AlignLeft, BookHeart, BookOpen, Clock3, Download, LockKeyhole, MailOpen, Maximize2, Minimize2, PenLine, Rotate3D, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadCoverBase, loadInsideArt, renderKeepsakeCard, renderVerticalKeepsakeCard } from "@/lib/art";
import { defaultDraft, type CardDraft } from "@/lib/cards";
import { decodeSharedLetter } from "@/lib/share-codec";
import CardScene from "./CardScene";
import { Brand, playPaperOpenSound, playWaxCrackSound, Stars, useMusic, useToast } from "./Shared";
import styles from "./LetterReader.module.css";

type Scene = "sealed" | "breaking" | "opened";

function remainingLabel(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const counter = [hours, minutes, seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
  return days ? `${days} 天 ${counter}` : counter;
}

const deliveryFormat = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function readTokenFromLocation(): string {
  const search = new URLSearchParams(window.location.search);
  const fromQuery = search.get("c");
  if (fromQuery) return fromQuery;
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("c=")) return decodeURIComponent(hash.slice(2));
  const hashParams = new URLSearchParams(hash);
  return hashParams.get("c") || "";
}

export default function LetterReader() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [deliverAt, setDeliverAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [scene, setScene] = useState<Scene>("sealed");
  const [draft, setDraft] = useState<CardDraft>(() => defaultDraft());
  const [open, setOpen] = useState(false);
  const [focusMessage, setFocusMessage] = useState(false);
  const [burst, setBurst] = useState(false);
  const [keepsakeMode, setKeepsakeMode] = useState<"spread" | "poster">("spread");
  const [keepsakeUrl, setKeepsakeUrl] = useState("");
  const [keepsakeSavedNote, setKeepsakeSavedNote] = useState("");
  const hasOpenedCard = useRef(false);
  const userMuted = useRef(false);
  const transcript = useRef<HTMLDialogElement>(null);
  const keepsakeDialog = useRef<HTMLDialogElement>(null);
  const { playing, start: startMusic, toggle } = useMusic(draft.music);
  const { notify, toast } = useToast();

  useEffect(() => {
    let active = true;
    async function load() {
      const token = readTokenFromLocation();
      if (!token) {
        if (active) {
          setLoadError("这条生日信链接不完整，请向寄件人重新索取。");
          setLoaded(true);
        }
        return;
      }
      const decoded = await decodeSharedLetter(token);
      if (!active) return;
      if (!decoded) {
        setLoadError("这封生日信链接已损坏或格式无效。");
        setLoaded(true);
        return;
      }
      setDraft(decoded.draft);
      setDeliverAt(decoded.deliverAt);
      setNow(Date.now());
      setLoadError("");
      setLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, []);

  const remaining = deliverAt ? Math.max(0, Math.ceil((Date.parse(deliverAt) - now) / 1000)) : 0;
  const locked = loaded && !loadError && remaining > 0;

  useEffect(() => {
    if (!locked) return;
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [locked]);

  function breakSeal() {
    if (!loaded || loadError || locked || scene !== "sealed") return;
    playWaxCrackSound();
    setScene("breaking");
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
    const next = !open;
    playPaperOpenSound();
    setOpen(next);
    if (!next) setFocusMessage(false);
    if (next && !hasOpenedCard.current) {
      hasOpenedCard.current = true;
      setBurst(true);
      if (draft.music.kind !== "none" && !userMuted.current) {
        startMusic();
      }
    }
  }

  function toggleMusic() {
    userMuted.current = playing;
    toggle();
  }

  async function renderKeepsake(mode: "spread" | "poster") {
    const [coverCanvas] = await Promise.all([
      mode === "poster" ? loadCoverBase(draft.template, "high") : Promise.resolve(undefined),
      loadInsideArt(draft.template),
    ]);
    const canvas = mode === "poster"
      ? renderVerticalKeepsakeCard(draft, coverCanvas)
      : renderKeepsakeCard(draft);
    setKeepsakeUrl(canvas.toDataURL("image/png"));
  }

  async function openKeepsake() {
    try {
      setKeepsakeSavedNote("");
      await renderKeepsake(keepsakeMode);
      keepsakeDialog.current?.showModal();
    } catch {
      notify("暂时无法生成纪念图，请稍后再试。");
    }
  }

  async function switchKeepsakeMode(mode: "spread" | "poster") {
    setKeepsakeMode(mode);
    setKeepsakeSavedNote("");
    try {
      await renderKeepsake(mode);
    } catch {
      notify("暂时无法切换纪念图样式，请稍后再试。");
    }
  }

  function downloadKeepsake() {
    if (!keepsakeUrl) return;
    const safeName = (draft.recipient.trim() || "birthday").replace(/[\\/:*?"<>|]/g, "");
    const link = document.createElement("a");
    link.href = keepsakeUrl;
    link.download = `birthday-card-${safeName}-${keepsakeMode}.png`;
    link.click();
    setKeepsakeSavedNote(keepsakeMode === "poster"
      ? "✓ 已开始下载 9:16 竖版海报（微信内也可长按上方图片保存）"
      : "✓ 已开始下载横版双页明信片（微信内也可长按上方图片保存）");
  }

  const recipient = draft.recipient;
  const canBreak = loaded && !loadError && scene === "sealed" && !locked;
  const stageTitle = !loaded ? "生日信" : scene === "opened" ? `Dear ${recipient}` : `给 ${recipient} 的生日信`;

  return (
    <main className={styles.page}>
      <header className={`site-header ${styles.header}`}>
        <Brand />
        <span className={styles.headerNote}><MailOpen size={15} aria-hidden="true" /> 一封生日信</span>
      </header>

      {loaded && loadError ? (
        <section className={styles.unavailable} aria-labelledby="letter-title">
          <span className={styles.emptyIcon}><MailOpen size={29} strokeWidth={1.35} aria-hidden="true" /></span>
          <h1 id="letter-title">这封信暂时打不开</h1>
          <p>{loadError}</p>
          <div className={styles.controls}>
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
              focusMessage={focusMessage}
              onToggle={toggleCard}
              onReady={extractionComplete}
            />
            {loaded && scene === "sealed" && !locked && (
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
            {!loaded ? (
              <p className={styles.hint} role="status">正在展开你的生日信…</p>
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
                点一下火漆，拆开这封生日信
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
                    <button type="button" className="pill pill-outline" aria-pressed={playing} onClick={toggleMusic}>
                      {playing ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
                      {playing ? "关闭音乐" : "播放音乐"}
                    </button>
                  )}
                  {open && (
                    <button type="button" className="pill pill-outline" aria-pressed={focusMessage} onClick={() => setFocusMessage((value) => !value)}>
                      {focusMessage ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
                      {focusMessage ? "看双页" : "放大读字"}
                    </button>
                  )}
                  {open && (
                    <button type="button" className="pill pill-outline" onClick={() => { void openKeepsake(); }}>
                      <Download size={16} aria-hidden="true" /> 保存纪念图
                    </button>
                  )}
                  {open && (
                    <button type="button" className="pill pill-outline" onClick={() => transcript.current?.showModal()}>
                      <AlignLeft size={17} aria-hidden="true" /> 文字版
                    </button>
                  )}
                </div>
                <p className={styles.hint}>
                  <Rotate3D size={15} aria-hidden="true" /> 拖动旋转 · 放大后单指平移看细节
                </p>
                <div className={styles.replyRow}>
                  <Link href="/" className={styles.replyLink}><PenLine size={14} aria-hidden="true" /> 我也想寄一封</Link>
                </div>
              </div>
            )}
          </div>

          {open && scene === "opened" && (
            <>
              <dialog ref={transcript} className={styles.transcript} aria-labelledby="transcript-title">
                <form method="dialog" className={styles.transcriptClose}>
                  <button type="submit" className="pill pill-outline" aria-label="关闭文字版"><X size={19} aria-hidden="true" /></button>
                </form>
                <article>
                  <h2 id="transcript-title">Dear {draft.recipient}</h2>
                  {draft.motto?.trim() && <p className={styles.transcriptMotto}>“{draft.motto.trim()}”</p>}
                  <p className={styles.transcriptBody}>{draft.message}</p>
                  {draft.sender && <p>— {draft.sender}</p>}
                  {draft.birthday && <time dateTime={draft.birthday}>{draft.birthday}</time>}
                </article>
              </dialog>

              <dialog ref={keepsakeDialog} className={`${styles.transcript} ${styles.keepsakeDialog}`} aria-labelledby="keepsake-title">
                <div className={styles.keepsakeHead}>
                  <h2 id="keepsake-title">保存贺卡纪念图</h2>
                  <form method="dialog">
                    <button type="submit" className="pill pill-outline" aria-label="关闭纪念图"><X size={18} aria-hidden="true" /></button>
                  </form>
                </div>
                <div className={styles.keepsakeTabs} role="tablist" aria-label="选择纪念图版式">
                  <button type="button" role="tab" aria-selected={keepsakeMode === "spread"} onClick={() => { void switchKeepsakeMode("spread"); }}>横版双页明信片</button>
                  <button type="button" role="tab" aria-selected={keepsakeMode === "poster"} onClick={() => { void switchKeepsakeMode("poster"); }}>9:16 竖版海报</button>
                </div>
                {keepsakeUrl && (
                  <img
                    src={keepsakeUrl}
                    alt={`给 ${draft.recipient} 的生日贺卡纪念图`}
                    className={`${styles.keepsakeImg} ${keepsakeMode === "poster" ? styles.keepsakePoster : ""}`}
                  />
                )}
                <p className={styles.keepsakeTip} role="status" aria-live="polite">
                  {keepsakeSavedNote || "手机微信内可长按上方图片保存到相册，桌面端可直接下载高清 PNG。"}
                </p>
                <div className={styles.keepsakeActions}>
                  <button type="button" className="pill pill-primary" onClick={downloadKeepsake}>
                    <Download size={16} aria-hidden="true" /> 下载高清图片
                  </button>
                </div>
              </dialog>
            </>
          )}
        </section>
      )}
      {toast}
    </main>
  );
}
