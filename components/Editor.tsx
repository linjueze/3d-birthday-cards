"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Copy, ExternalLink, Eye,
  EyeOff, Layers2, Mail, Music2, PackageCheck, Pause, Play, Redo2, Send, Sparkles, Stamp,
  Sticker as StickerIcon, Trash2, Type, Undo2, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import CardScene from "@/components/CardScene";
import { Brand, copyText, prepareSealSound, Stars, useMusic, useToast } from "@/components/Shared";
import { CardThumb, StickerThumb } from "@/components/Thumbnails";
import { loadCoverArt, STICKER_BASE_SIZE } from "@/lib/art";
import {
  defaultDraft, FONT_OPTIONS, isTemplateSlug, PAPER_OPTIONS, STICKERS, TEMPLATES, WISHES,
  type CardDraft, type Music, type StickerId, type TemplateSlug,
} from "@/lib/cards";
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_STICKERS } from "@/lib/letters";
import { encodeSharedLetter, saveLocalOutboxItem, withBasePath } from "@/lib/share-codec";

const tools = [
  { id: "cover", label: "封面", icon: Layers2 },
  { id: "paper", label: "纸张", icon: BookOpen },
  { id: "stickers", label: "贴纸", icon: StickerIcon },
  { id: "text", label: "文字", icon: Type },
  { id: "music", label: "音乐", icon: Music2 },
] as const;

type Drawer = typeof tools[number]["id"];
type PackState = "none" | "packing" | "unsealed" | "sealed";
type Delivery = "now" | "birthday" | "custom";
type History = { past: CardDraft[]; draft: CardDraft; future: CardDraft[] };
const holdDuration = 1000;
const storyMusic: Music = { kind: "music-box" };
const silentMusic: Music = { kind: "none" };
const cap = (past: CardDraft[], snapshot: CardDraft) => [...past.slice(-79), snapshot];

function makeId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function deliveryDate(delivery: Delivery, birthday: string, scheduled: string): string | null {
  if (delivery === "now") return null;
  const date = delivery === "birthday" ? birthday && new Date(`${birthday}T00:00:00`) : scheduled && new Date(scheduled);
  if (!date || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new Error(delivery === "birthday" ? "请选择还未到来的生日日期。" : "请选择一个未来的送达时间。");
  }
  return date.toISOString();
}

type SentShare = {
  id: string;
  recipientPath: string;
  outboxPath: string;
};

export default function Editor({ initialTemplate }: { initialTemplate?: TemplateSlug }) {
  const searchParams = useSearchParams();
  const queryTemplate = searchParams.get("template");
  const resolvedTemplate = initialTemplate ?? (isTemplateSlug(queryTemplate) ? queryTemplate : undefined);
  const [history, setHistory] = useState<History>(() => ({ past: [], draft: defaultDraft(resolvedTemplate), future: [] }));
  const { draft, past, future } = history;
  const [drawer, setDrawer] = useState<Drawer | null>("text");
  const [open, setOpen] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pack, setPack] = useState<PackState>("none");
  const [progress, setProgress] = useState(0);
  const [delivery, setDelivery] = useState<Delivery>("now");
  const [scheduled, setScheduled] = useState("");
  const [minimum, setMinimum] = useState("");
  const [sent, setSent] = useState<SentShare | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const { notify, toast } = useToast();
  const { playing, toggle: toggleMusic, stop: stopMusic } = useMusic(draft.music);
  const recipientInput = useRef<HTMLInputElement>(null);
  const dragOriginal = useRef<CardDraft | null>(null);
  const holdFrame = useRef<number | null>(null);
  const sealSound = useRef<ReturnType<typeof prepareSealSound>>(null);
  const sending = useRef(false);
  const theme = TEMPLATES.find(({ slug }) => slug === draft.template) ?? TEMPLATES[0];
  const activeSticker = draft.stickers.find(({ id }) => id === selectedSticker);
  const nextPanel = pack !== "none" ? (pack === "sealed" ? "pack" : null) : preview ? null : drawer;

  const edit = useCallback((change: Partial<CardDraft> | ((draft: CardDraft) => CardDraft)) => {
    setHistory((current) => {
      const next = typeof change === "function" ? change(current.draft) : { ...current.draft, ...change };
      if (next === current.draft || Object.keys(next).every((key) => next[key as keyof CardDraft] === current.draft[key as keyof CardDraft])) return current;
      return { past: cap(current.past, current.draft), draft: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      return previous ? { past: current.past.slice(0, -1), draft: previous, future: [current.draft, ...current.future] } : current;
    });
  }, []);
  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      return next ? { past: cap(current.past, current.draft), draft: next, future: current.future.slice(1) } : current;
    });
  }, []);

  useEffect(() => {
    setMinimum(localDateValue());
    setBaseUrl(window.location.origin);
    for (const item of TEMPLATES) void loadCoverArt(item.slug);
  }, []);

  useEffect(() => {
    if (pack !== "none") return;
    const keyboard = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable]"))) return;
      const key = event.key.toLowerCase();
      if (key === "z") { event.preventDefault(); (event.shiftKey ? redo : undo)(); }
      if (key === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [pack, redo, undo]);

  useEffect(() => () => {
    if (holdFrame.current !== null) cancelAnimationFrame(holdFrame.current);
    sealSound.current?.dispose();
  }, []);

  function selectDrawer(id: Drawer) {
    setPreview(false);
    setDrawer((value) => {
      const next = value === id ? null : id;
      if (next !== "stickers") setSelectedSticker(null);
      return next;
    });
    if (id === "stickers" || id === "text") setOpen(true);
    if (id === "cover") setOpen(false);
  }

  function addSticker(type: StickerId) {
    if (draft.stickers.length >= MAX_STICKERS) { notify(`这一页已经放了 ${MAX_STICKERS} 枚贴纸。`); return; }
    const id = makeId();
    const spawnSlots: readonly [number, number][] = [
      [.23, .77], [.77, .28], [.23, .58], [.78, .56], [.38, .78], [.62, .28], [.24, .36], [.76, .42],
    ];
    edit((current) => {
      const index = current.stickers.length;
      const [baseX, baseY] = spawnSlots[index % spawnSlots.length];
      const ring = Math.floor(index / spawnSlots.length);
      const x = Math.min(.86, Math.max(.14, baseX + (ring % 2 ? .04 : -.03) * Math.min(ring, 2)));
      const y = Math.min(.86, Math.max(.14, baseY - ring * .03));
      return { ...current, stickers: [...current.stickers, { id, type, x, y, scale: 1 }] };
    });
    setSelectedSticker(id);
    setOpen(true);
  }

  function moveSticker(id: string, x: number, y: number) {
    dragOriginal.current ??= draft;
    setHistory((current) => ({
      ...current,
      draft: { ...current.draft, stickers: current.draft.stickers.map((sticker) => sticker.id === id ? { ...sticker, x, y } : sticker) },
    }));
  }

  function finishSticker() {
    const snapshot = dragOriginal.current;
    dragOriginal.current = null;
    if (snapshot) setHistory((current) => ({ ...current, past: cap(current.past, snapshot), future: [] }));
  }

  function clampSticker(sticker: CardDraft["stickers"][number], change: { scale?: number; x?: number; y?: number }) {
    const scale = change.scale ?? sticker.scale;
    const padX = Math.max(.12, STICKER_BASE_SIZE * scale * .58 + .02);
    const padY = Math.max(.10, STICKER_BASE_SIZE * scale * .44 + .02);
    const x = Math.min(1 - padX, Math.max(padX, change.x ?? sticker.x));
    const y = Math.min(1 - padY, Math.max(padY, change.y ?? sticker.y));
    return { ...sticker, scale, x, y };
  }

  function adjustSticker(change: { scale?: number; x?: number; y?: number }) {
    if (!activeSticker) return;
    edit((current) => ({ ...current, stickers: current.stickers.map((sticker) => sticker.id === activeSticker.id ? clampSticker(sticker, change) : sticker) }));
  }

  function deleteSticker() {
    if (!activeSticker) return;
    edit((current) => ({ ...current, stickers: current.stickers.filter(({ id }) => id !== activeSticker.id) }));
    setSelectedSticker(null);
  }

  function startPacking() {
    if (!draft.recipient.trim()) {
      notify("在「Dear」后面写上 TA 的名字，寄件箱里靠它区分每一封");
      flushSync(() => { setDrawer("text"); setPreview(false); setOpen(true); });
      recipientInput.current?.focus();
      return;
    }
    stopMusic();
    sealSound.current?.dispose();
    sealSound.current = prepareSealSound();
    setOpen(false);
    setPreview(false);
    setSelectedSticker(null);
    setPack("packing");
    setProgress(0);
  }

  const sceneReady = useCallback(() => {
    setPack((value) => value === "packing" ? "unsealed" : value);
  }, []);

  function startHold() {
    if (holdFrame.current !== null || pack !== "unsealed") return;
    const start = performance.now();
    const advance = (now: number) => {
      const complete = Math.min(1, (now - start) / holdDuration);
      setProgress(complete);
      if (complete < 1) holdFrame.current = requestAnimationFrame(advance);
      else {
        holdFrame.current = null;
        setPack("sealed");
        sealSound.current?.play();
      }
    };
    holdFrame.current = requestAnimationFrame(advance);
  }

  function stopHold() {
    if (holdFrame.current === null) return;
    cancelAnimationFrame(holdFrame.current);
    holdFrame.current = null;
    setProgress(0);
  }

  function holdPointer(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold();
  }

  function holdKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) startHold();
  }

  function backToWriting() {
    stopHold();
    sealSound.current?.dispose();
    sealSound.current = null;
    setPack("none");
    setProgress(0);
    setSent(null);
    setOpen(false);
  }

  async function sendLetter() {
    if (sending.current || sent || pack !== "sealed") return;
    let deliverAt: string | null;
    try {
      deliverAt = deliveryDate(delivery, draft.birthday, scheduled);
    } catch (error) {
      notify(error instanceof Error ? error.message : "请选择送达时间。");
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      const token = await encodeSharedLetter(draft, deliverAt);
      const id = makeId();
      const recipientPath = `/letter/?c=${encodeURIComponent(token)}`;
      const outboxPath = "/outbox/";
      saveLocalOutboxItem({
        id,
        recipient: draft.recipient.trim(),
        template: draft.template,
        createdAt: new Date().toISOString(),
        deliverAt,
        sharePath: recipientPath,
      });
      setSent({ id, recipientPath, outboxPath });
    } catch (error) {
      notify(error instanceof Error ? error.message : "暂时无法生成链接，请重试。");
    } finally { sending.current = false; setBusy(false); }
  }

  function newLetter(duplicate: boolean) {
    const fresh = duplicate ? { ...draft, recipient: "", birthday: "", stickers: draft.stickers.map((sticker) => ({ ...sticker })) } : defaultDraft();
    setHistory({ past: [], draft: fresh, future: [] });
    setDelivery("now");
    setScheduled("");
    setSelectedSticker(null);
    setDrawer("text");
    backToWriting();
    notify(duplicate ? "已保留贺卡内容，写上下一位收件人的名字吧。" : "新的生日信已准备好。");
  }

  async function copy(path: string) {
    try { await copyText(baseUrl + withBasePath(path)); notify("链接已复制"); }
    catch { notify("可以选中链接并手动复制。"); }
  }

  return <main className="editor-shell" data-pack={pack}>
    <header className="site-header editor-header">
      <div className="editor-header-brand"><Brand /><Link href="/" className="editor-home" aria-label="返回首页"><ArrowLeft size={15} /> 首页</Link></div>
      <div className="editor-steps" aria-label="制作步骤">
        <button type="button" className={pack === "none" ? "current-step" : ""} disabled={pack === "none" || busy || !!sent} onClick={backToWriting}><span>{pack === "none" ? "1" : <Check size={13} />}</span>做卡</button>
        <ChevronRight size={14} />
        <span className={pack !== "none" ? "current-step" : ""}><span>2</span>封装</span>
      </div>
      {pack === "none"
        ? <button type="button" className="pill pill-primary editor-next" onClick={startPacking}>下一步 <ArrowRight size={16} /></button>
        : <span className="editor-header-end">{sent ? <><Check size={16} /> 已生成</> : <><Stamp size={16} /> 封装中</>}</span>}
    </header>
    <div className={`editor-workspace ${nextPanel ? "editor-with-panel" : ""}`}>
      <section className="editor-stage" aria-label={pack === "none" ? "实时 3D 贺卡预览" : "3D 信封封装"}>
        <div className="editor-stage-top">
          <div>
            <p className="eyebrow">{pack === "none" ? "贺卡工作台" : "信封工作台"}</p>
            <h1>{pack === "none" ? theme.name : sent ? "生日信已寄出" : "把心意封好"}</h1>
          </div>
          {pack === "none" && <div className="editor-stage-actions glass">
            <button type="button" className="icon-btn" aria-label="撤销" title="撤销" disabled={!past.length} onClick={undo}><Undo2 size={18} /></button>
            <button type="button" className="icon-btn" aria-label="重做" title="重做" disabled={!future.length} onClick={redo}><Redo2 size={18} /></button>
            <span />
            <button type="button" className="pill editor-preview" aria-pressed={preview} onClick={() => { setPreview(!preview); setSelectedSticker(null); }}>{preview ? <EyeOff size={16} /> : <Eye size={16} />}<span>{preview ? "退出预览" : "预览"}</span></button>
          </div>}
        </div>
        {pack !== "none" && <Stars burst={pack === "sealed"} key={pack === "sealed" ? "burst" : "slow"} />}
        <div className="editor-artwork">
          <div className="editor-artwork-glow" aria-hidden="true" />
          <CardScene draft={draft} mode={pack === "none" ? "editor" : "pack"} open={open} envelope={pack} sealProgress={progress} onReady={sceneReady}
            onToggle={pack === "none" ? () => setOpen((value) => !value) : undefined}
            onStickerSelect={!preview && pack === "none" ? setSelectedSticker : undefined}
            selectedSticker={!preview ? selectedSticker : null} onStickerMove={!preview ? moveSticker : undefined} onStickerCommit={!preview ? finishSticker : undefined} />
          {pack === "unsealed" && <button type="button" className="seal-target" aria-label="按住火漆处 1 秒，盖上印章" onPointerDown={holdPointer} onPointerUp={stopHold} onPointerCancel={stopHold} onLostPointerCapture={stopHold}
            onKeyDown={holdKey} onKeyUp={stopHold} onBlur={stopHold} onClick={(event) => { if (event.detail === 0) startHold(); }} onContextMenu={(event) => event.preventDefault()}>
            <svg viewBox="0 0 74 74" width="74" height="74" aria-hidden="true">
              <circle cx="37" cy="37" r="33" className="seal-track" />
              <circle cx="37" cy="37" r="33" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} className="seal-progress" />
            </svg>
            {progress === 0 && <Stamp size={20} strokeWidth={1.55} />}
          </button>}
        </div>
        <div className="stage-caption">
          {pack === "none" ? <div className="stage-view glass">
            <button type="button" aria-pressed={!open} onClick={() => setOpen(false)}>封面 <span>1/2</span></button>
            <button type="button" aria-pressed={open} onClick={() => setOpen(true)}>内页 <span>2/2</span></button>
            <i />
            <button type="button" className="stage-fold" onClick={() => setOpen((value) => !value)}><BookOpen size={15} />{open ? "合上贺卡" : "翻开贺卡"}</button>
          </div> : <div className="pack-footer">
            <div className="pack-note" aria-live="polite">
              {pack === "packing" ? "正在将贺卡装入信封…" : pack === "unsealed" ? "按住火漆处 1 秒，盖上印章" : sent ? "把收件人链接发给 TA，就能送达这份心意。" : "火漆已盖好，可以寄出了。"}
            </div>
            {!sent && <button type="button" className="pill pill-outline edit-again" disabled={busy} onClick={backToWriting}><ArrowLeft size={15} />返回做卡</button>}
          </div>}
        </div>
      </section>

      {pack === "none" && !preview && drawer && <aside className="editor-panel glass" aria-label={tools.find(({ id }) => id === drawer)?.label}>
        <div className="editor-panel-title">
          <div><h2>{drawer === "text" ? "写下祝福" : drawer === "cover" ? "挑选封面" : drawer === "paper" ? "挑选纸张" : drawer === "stickers" ? "点缀贴纸" : "搭配音乐"}</h2>
            <p>{drawer === "text" ? "写在贺卡内页，等 TA 亲手翻开。" : drawer === "cover" ? "四种纸艺主题，点击更换封面。" : drawer === "paper" ? "拖动贺卡，可看到纸纹与光泽变化。" : drawer === "stickers" ? "点选添加，拖动内页上的贴纸以移动。" : "拆信后，收件人可以选择播放。"}</p></div>
          <button type="button" className="icon-btn panel-close" aria-label="收起面板" onClick={() => { setDrawer(null); setSelectedSticker(null); }}><X size={18} /></button>
        </div>
        {drawer === "cover" && <div className="editor-cover-grid">
          {TEMPLATES.map((item) => <button type="button" key={item.slug} className="editor-cover-choice" aria-pressed={draft.template === item.slug} onClick={() => edit({ template: item.slug })}>
            <div style={{ backgroundColor: item.color }}><CardThumb slug={item.slug} /></div><span>{item.name}</span>
          </button>)}
        </div>}
        {drawer === "paper" && <div className="option-list">
          {PAPER_OPTIONS.map((paper) => <button type="button" key={paper.id} className="option-row" aria-pressed={draft.paper === paper.id} onClick={() => edit({ paper: paper.id })}>
            <i className="paper-sample" style={{ backgroundColor: paper.color }} />
            <span><strong>{paper.label}</strong><small>{paper.description}</small></span>
            {draft.paper === paper.id && <Check size={17} />}
          </button>)}
        </div>}
        {drawer === "stickers" && <>
          <div className="sticker-grid">{STICKERS.map((sticker) => <button type="button" key={sticker.id} aria-label={`添加${sticker.label}`} title={sticker.label} onClick={() => addSticker(sticker.id)}><StickerThumb type={sticker.id} /><span>{sticker.label}</span></button>)}</div>
          {draft.stickers.length > 0 && <div className="placed-stickers">
            <label className="field"><span>选择已放置贴纸</span>
              <select value={activeSticker?.id ?? ""} onChange={(event) => setSelectedSticker(event.target.value || null)}><option value="">请选择</option>{draft.stickers.map((sticker, index) => <option key={sticker.id} value={sticker.id}>{STICKERS.find(({ id }) => id === sticker.type)?.label} {index + 1}</option>)}</select>
            </label>
            {activeSticker && <>
              <label className="range-field">大小<input type="range" min=".4" max="1.6" step=".05" value={activeSticker.scale} onChange={(event) => adjustSticker({ scale: Number(event.target.value) })} /></label>
              <label className="range-field">横向<input type="range" min=".12" max=".88" step=".01" value={activeSticker.x} onChange={(event) => adjustSticker({ x: Number(event.target.value) })} /></label>
              <label className="range-field">纵向<input type="range" min=".12" max=".88" step=".01" value={activeSticker.y} onChange={(event) => adjustSticker({ y: Number(event.target.value) })} /></label>
              <button type="button" className="pill pill-outline sticker-delete" onClick={deleteSticker}><Trash2 size={15} /> 删除贴纸</button>
            </>}
          </div>}
        </>}
        {drawer === "text" && <div className="text-tools">
          <label className="field"><span>收件人</span><span className="recipient-field"><span>Dear</span><input ref={recipientInput} value={draft.recipient} onChange={(event) => { edit({ recipient: event.target.value }); setOpen(true); }} maxLength={MAX_NAME_LENGTH} placeholder="TA 的名字" /></span></label>
          <label className="field"><span>生日祝福</span><textarea rows={4} value={draft.message} onChange={(event) => { edit({ message: event.target.value }); setOpen(true); }} maxLength={MAX_MESSAGE_LENGTH} placeholder="把想说的话写在这里…" /></label>
          <label className="field"><span>落款</span><input value={draft.sender} onChange={(event) => { edit({ sender: event.target.value }); setOpen(true); }} maxLength={MAX_NAME_LENGTH} placeholder="你的名字" /></label>
          <div className="field"><span>书写字体</span><div className="font-options">{FONT_OPTIONS.map((font) => <button type="button" key={font.id} aria-pressed={draft.font === font.id} onClick={() => edit({ font: font.id })} style={{ fontFamily: `"${font.family}", serif` }}>{font.label}</button>)}</div></div>
          <details className="wishes"><summary><Sparkles size={15} /> 选一句生日祝福 <ChevronRight size={15} /></summary>
            {WISHES.map((wish) => <button type="button" key={wish} onClick={() => { edit({ message: wish }); setOpen(true); }}>{wish}</button>)}
          </details>
          <label className="field"><span>生日日期印章 <small>选填</small></span><input type="date" value={draft.birthday} onChange={(event) => { edit({ birthday: event.target.value }); setOpen(true); }} /></label>
        </div>}
        {drawer === "music" && <div className="option-list">
          <button type="button" className="option-row" aria-pressed={draft.music.kind === "music-box"} onClick={() => edit({ music: storyMusic })}><Music2 size={21} /><span><strong>八音盒 · 生日快乐</strong><small>内置合成旋律，零服务器直放</small></span>{draft.music.kind === "music-box" && <Check size={17} />}</button>
          <button type="button" className="option-row" aria-pressed={draft.music.kind === "none"} onClick={() => edit({ music: silentMusic })}><Pause size={21} /><span><strong>无背景音乐</strong><small>安静地读一封信</small></span>{draft.music.kind === "none" && <Check size={17} />}</button>
          {draft.music.kind !== "none" && <button type="button" className="pill pill-outline music-preview" onClick={toggleMusic}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "停止试听" : "试听音乐"}</button>}
        </div>}
      </aside>}

      {pack === "sealed" && <aside className="editor-panel send-panel glass" aria-label={sent ? "分享生日信" : "寄出配置"}>
        {sent ? <>
          <div className="send-icon"><PackageCheck size={27} strokeWidth={1.5} /></div>
          <h2>生日信已封好</h2>
          <p>把这条专属链接发给 {draft.recipient.trim()}，点开就能拆火漆读信。</p>
          <div className="share-field">
            <label htmlFor="recipient-link">收件人专属链接</label>
            <div><input id="recipient-link" readOnly value={baseUrl + withBasePath(sent.recipientPath)} onFocus={(event) => event.currentTarget.select()} />
              <button type="button" className="icon-btn" aria-label="复制收件人链接" title="复制收件人链接" onClick={() => void copy(sent.recipientPath)}><Copy size={16} /></button>
              <Link className="icon-btn" href={sent.recipientPath} target="_blank" rel="noreferrer" aria-label="打开预览" title="在新标签预览"><ExternalLink size={16} /></Link></div>
          </div>
          <div className="share-field">
            <label htmlFor="outbox-link">本机寄件箱</label>
            <div><input id="outbox-link" readOnly value={baseUrl + withBasePath(sent.outboxPath)} onFocus={(event) => event.currentTarget.select()} />
              <button type="button" className="icon-btn" aria-label="复制寄件箱链接" title="复制寄件箱链接" onClick={() => void copy(sent.outboxPath)}><Copy size={16} /></button>
              <Link className="icon-btn" href={sent.outboxPath} target="_blank" rel="noreferrer" aria-label="打开寄件箱" title="打开寄件箱"><ExternalLink size={16} /></Link></div>
          </div>
          <div className="send-shortcuts">
            <button type="button" className="pill pill-primary" onClick={() => newLetter(true)}><Copy size={16} />复制一封，寄给下一位</button>
            <button type="button" className="pill pill-outline" onClick={() => newLetter(false)}>从头写一封</button>
          </div>
        </> : <>
          <div className="send-icon"><Mail size={28} strokeWidth={1.5} /></div>
          <h2>寄给 {draft.recipient.trim()}</h2>
          <p>选好 TA 可以拆信的时间。</p>
          <fieldset className="delivery-options" disabled={busy}>
            <legend>送达时机</legend>
            {([{ id: "now", label: "立刻送达" }, { id: "birthday", label: "生日零点" }, { id: "custom", label: "自选日期" }] as const).map((item) => <label key={item.id}><input type="radio" name="delivery" checked={delivery === item.id} onChange={() => setDelivery(item.id)} />{item.label}</label>)}
          </fieldset>
          {delivery === "birthday" && <label className="field"><span>收件人的生日</span><input type="date" disabled={busy} min={minimum.slice(0, 10)} value={draft.birthday} onChange={(event) => edit({ birthday: event.target.value })} /></label>}
          {delivery === "custom" && <label className="field"><span>送达日期与时间</span><input type="datetime-local" disabled={busy} min={minimum} value={scheduled} onChange={(event) => setScheduled(event.target.value)} /></label>}
          {delivery !== "now" && <p className="time-note"><CircleHelp size={15} /> 时间以收件人设备时区为准。</p>}
          <button type="button" className="pill pill-primary send-letter" disabled={busy} onClick={() => void sendLetter()}><Send size={17} />{busy ? "正在生成链接…" : "生成分享链接"}</button>
        </>}
      </aside>}
    </div>
    {pack === "none" && <nav className="editor-dock glass" aria-label="贺卡编辑工具">
      {tools.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={!preview && drawer === id} onClick={() => selectDrawer(id)}><Icon size={19} strokeWidth={1.65} /><span>{label}</span></button>)}
    </nav>}
    {toast}
  </main>;
}
