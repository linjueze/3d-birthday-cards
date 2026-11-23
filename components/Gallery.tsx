"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Mouse, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CardScene from "@/components/CardScene";
import { Brand, useToast } from "@/components/Shared";
import { CardThumb } from "@/components/Thumbnails";
import { loadCoverArt } from "@/lib/art";
import { defaultDraft, TEMPLATES, type TemplateSlug } from "@/lib/cards";

export default function Gallery() {
  const [slug, setSlug] = useState<TemplateSlug>(TEMPLATES[0].slug);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    for (const item of TEMPLATES) void loadCoverArt(item.slug);
  }, []);
  const selected = TEMPLATES.findIndex((theme) => theme.slug === slug);
  const template = TEMPLATES[selected];
  const draft = useMemo(() => ({
    ...defaultDraft(slug), recipient: "亲爱的你", message: "生日快乐！\n愿你新的一岁被温柔与惊喜环绕。", sender: "惦记你的人",
  }), [slug]);

  function choose(next: TemplateSlug) {
    setSlug(next);
    setOpen(false);
  }

  function move(direction: number) {
    choose(TEMPLATES[(selected + direction + TEMPLATES.length) % TEMPLATES.length].slug);
  }

  return <main className="gallery-shell">
    <header className="site-header gallery-header">
      <Brand />
      <Link className="pill pill-outline top-outbox" href="/outbox"><Send size={15} />寄件箱</Link>
    </header>
    <section className="gallery-main" aria-labelledby="gallery-title">
      <div className="hero-copy">
        <div className="hero-tag"><Sparkles size={14} strokeWidth={1.6} /><span>3D 生日贺卡工作室</span></div>
        <h1 id="gallery-title">把生日，<br /><em>写成一封信。</em></h1>
        <p>挑一张立体纸艺贺卡，写下想说的话，<br className="desktop-break" /> 盖上火漆，把心意寄给重要的人。</p>
        <div className="hero-hint"><Mouse size={16} strokeWidth={1.65} /> 拖动旋转，滚轮放大查看细节 <ArrowDownRight size={14} /></div>
      </div>
      <div className={`gallery-display ${open ? "gallery-display-open" : ""}`}>
        <div className="gallery-glow" aria-hidden="true" />
        <span className="gallery-spark spark-a" aria-hidden="true">✦</span>
        <span className="gallery-spark spark-b" aria-hidden="true">✧</span>
        <span className="gallery-spark spark-c" aria-hidden="true">✦</span>
        <div className="gallery-scene scene-wrap">
          <CardScene draft={draft} mode="gallery" open={open} onToggle={() => setOpen((value) => !value)} onTemplateSelect={choose} />
        </div>
        <div className="gallery-caption" aria-live="polite">
          <button className="icon-btn gallery-arrow" type="button" aria-label="上一张模板" onClick={() => move(-1)}><ChevronLeft size={19} /></button>
          <div><strong>{template.name}</strong><span>{template.english}</span></div>
          <button className="icon-btn gallery-arrow" type="button" aria-label="下一张模板" onClick={() => move(1)}><ChevronRight size={19} /></button>
        </div>
      </div>
    </section>
    <nav className="gallery-dock glass" aria-label="贺卡模板与操作">
      <div className="dock-templates" aria-label="选择封面">
        {TEMPLATES.map((theme) => <button key={theme.slug} type="button" className={`swatch ${slug === theme.slug ? "swatch-current" : ""}`} aria-pressed={slug === theme.slug} aria-label={theme.name} title={theme.name} onClick={() => choose(theme.slug)}>
          <CardThumb slug={theme.slug} />
        </button>)}
      </div>
      <span className="dock-divider" aria-hidden="true" />
      <button type="button" className="pill pill-quiet dock-open" onClick={() => setOpen((value) => !value)}><BookOpen size={17} />{open ? "合上贺卡" : "翻开贺卡"}</button>
      <Link className="pill pill-primary dock-create" href={`/editor?template=${slug}`}>制作贺卡<ArrowRight size={17} /></Link>
    </nav>
    <footer className="gallery-footer"><span>Birthday Cards</span><span>纸艺贺卡 · 私密链接分享</span></footer>
    {toast}
  </main>;
}
