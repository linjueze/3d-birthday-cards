"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { COVER_MANIFEST, coverArt, insideArt, linerArt, loadCoverArt, STICKER_BASE_SIZE, stickerArt } from "@/lib/art";
import { TEMPLATES, type TemplateSlug } from "@/lib/cards";
import { createStage, FALLBACK_TIMINGS, GALLERY_SLOTS, galleryOffset, type SceneHit, type SceneProps, type SceneStage } from "@/lib/scene-stage";
import "@/lib/scene-fallback.css";

type ActiveGesture = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  hit: SceneHit;
  moved: boolean;
};

function PaintedCanvas({ image, className, style, sticker }: { image: HTMLCanvasElement; className?: string; style?: CSSProperties; sticker?: string }) {
  const element = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = element.current;
    if (!canvas) return;
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
  }, [image]);
  return <canvas aria-hidden="true" ref={element} className={className} style={style} data-scene-sticker={sticker} />;
}

function FallbackCover({ slug }: { slug: TemplateSlug }) {
  const [replacement, setReplacement] = useState<{ slug: TemplateSlug; canvas: HTMLCanvasElement }>();
  useEffect(() => {
    if (!Object.keys(COVER_MANIFEST[slug].maps ?? {}).length) return;
    let current = true;
    void loadCoverArt(slug).then((art) => {
      if (current) setReplacement({ slug, canvas: art.composite });
    }).catch(() => undefined);
    return () => { current = false; };
  }, [slug]);
  return <PaintedCanvas image={replacement?.slug === slug ? replacement.canvas : coverArt(slug).composite} />;
}

function Fallback({ draft, mode, envelope, open, sealProgress, selectedSticker }: SceneProps) {
  const [mounted, setMounted] = useState(false);
  const [fontVersion, setFontVersion] = useState(0);
  useEffect(() => {
    setMounted(true);
    const refresh = () => setFontVersion((version) => version + 1);
    document.fonts?.addEventListener("loadingdone", refresh);
    return () => document.fonts?.removeEventListener("loadingdone", refresh);
  }, []);

  if (!mounted) return null;
  const gallery = mode === "gallery";
  const packPhase = envelope === "packing" || envelope === "breaking";
  const envelopeVisible = !!envelope && envelope !== "none" && envelope !== "opened";
  return (
    <div className="scene-fallback" data-phase={envelope ?? "none"} aria-hidden="true">
      {gallery && TEMPLATES.filter((template) => template.slug !== draft.template).map((template) => {
        const slot = GALLERY_SLOTS[galleryOffset(template.slug, draft.template)];
        const style = {
          "--slot-x": slot.x,
          "--slot-y": slot.y,
          "--slot-yaw": slot.yaw + "rad",
          "--slot-roll": slot.roll + "rad",
          "--slot-scale": slot.scale,
          zIndex: Math.round(slot.z * 100) + 160,
        } as CSSProperties;
        return (
          <div className="scene-fallback-side" key={template.slug} style={style} data-scene-card={template.slug} data-open={open ?? false}>
            <FallbackCover slug={template.slug} />
          </div>
        );
      })}
      {(!envelopeVisible || packPhase) && (
        <div className="scene-fallback-book" data-open={!!open && !envelopeVisible} data-scene-card={draft.template}>
          <div className="scene-fallback-inside" data-scene-paper>
            {open && !envelopeVisible && (
              <>
                <PaintedCanvas key={fontVersion} image={insideArt(draft, "right", false)} />
                {draft.stickers.map((sticker) => (
                  <PaintedCanvas
                    key={sticker.id}
                    sticker={sticker.id}
                    image={stickerArt(sticker.type)}
                    className={selectedSticker === sticker.id ? "scene-fallback-sticker is-selected" : "scene-fallback-sticker"}
                    style={{ left: sticker.x * 100 + "%", top: sticker.y * 100 + "%", width: STICKER_BASE_SIZE * sticker.scale * 100 + "%" }}
                  />
                ))}
              </>
            )}
          </div>
          <div className="scene-fallback-cover">
            <div className="scene-fallback-front"><FallbackCover slug={draft.template} /></div>
            <div className="scene-fallback-left">
              {open && !envelopeVisible && <PaintedCanvas image={insideArt(draft, "left", false)} />}
            </div>
          </div>
        </div>
      )}
      {envelopeVisible && (
        <div className="scene-fallback-envelope">
          <div className="scene-envelope-back"><PaintedCanvas image={linerArt()} /></div>
          <div className="scene-envelope-pocket" />
          <div className="scene-envelope-flap"><PaintedCanvas image={linerArt()} /></div>
          {envelope === "sealed" || envelope === "breaking" ? (
            <div className="scene-envelope-stamp"><span>✦</span><span>✦</span></div>
          ) : (
            <div className="scene-envelope-molten" style={{ "--seal-progress": sealProgress ?? 0 } as CSSProperties} />
          )}
        </div>
      )}
    </div>
  );
}

function fallbackHit(element: HTMLElement, bounds: HTMLDivElement, props: SceneProps, x: number, y: number): SceneHit {
  const paper = bounds.querySelector<HTMLElement>("[data-scene-paper]");
  const point = paper?.getBoundingClientRect();
  const card = element.closest<HTMLElement>("[data-scene-card]");
  const sticker = props.mode === "editor" && props.open && element.getAttribute("data-scene-sticker");
  const slug = card?.dataset.sceneCard as SceneHit["slug"];
  if (!sticker || !point) return { slug };
  const selected = props.draft.stickers.find((item) => item.id === sticker);
  if (!selected) return { slug };
  return {
    slug,
    sticker,
    x: (x - point.left) / point.width - selected.x,
    y: (y - point.top) / point.height - selected.y,
  };
}

function fallbackPoint(root: RefObject<HTMLDivElement | null>, x: number, y: number) {
  const paper = root.current?.querySelector<HTMLElement>("[data-scene-paper]")?.getBoundingClientRect();
  if (!paper) return;
  return { x: (x - paper.left) / paper.width, y: (y - paper.top) / paper.height };
}

function limit(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export default function CardScene(props: SceneProps) {
  const latest = useRef(props);
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<ActiveGesture | null>(null);
  const stage = useRef<SceneStage | undefined>(undefined);
  const fallbackRotation = useRef({ pitch: 0, yaw: 0 });
  const [gpu, setGpu] = useState(false);

  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    stage.current = createStage(element, () => latest.current, setGpu);
    return () => {
      stage.current?.destroy();
      stage.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (gpu || props.envelope !== "packing" && props.envelope !== "breaking") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => latest.current.onReady?.(), reduced ? 125 : FALLBACK_TIMINGS[props.envelope]);
    return () => window.clearTimeout(timeout);
  }, [gpu, props.envelope]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || gesture.current) return;
    const { clientX, clientY, pointerId, currentTarget } = event;
    const hit = gpu && stage.current ? stage.current.hit(clientX, clientY) : fallbackHit(event.target as HTMLElement, currentTarget, props, clientX, clientY);
    gesture.current = { id: pointerId, startX: clientX, startY: clientY, lastX: clientX, lastY: clientY, hit, moved: false };
    if (hit.sticker) props.onStickerSelect?.(hit.sticker);
    currentTarget.setPointerCapture(pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.lastX;
    const dy = event.clientY - active.lastY;
    if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) <= 4) return;
    active.lastX = event.clientX;
    active.lastY = event.clientY;
    active.moved = true;

    if (active.hit.sticker && props.onStickerMove) {
      const p = gpu && stage.current ? stage.current.paperPoint(event.clientX, event.clientY) : fallbackPoint(root, event.clientX, event.clientY);
      if (p) {
        const x = limit(p.x - (active.hit.x ?? 0), .09, .91);
        const y = limit(p.y - (active.hit.y ?? 0), .08, .92);
        props.onStickerMove(active.hit.sticker, x, y);
      }
    } else if (active.hit.slug === props.draft.template) {
      if (gpu && stage.current) {
        stage.current.rotate(dx, dy);
      } else {
        const tilt = fallbackRotation.current;
        tilt.pitch = limit(tilt.pitch + dy * .28, -26, 26);
        tilt.yaw = limit(tilt.yaw + dx * .29, -37, 37);
        root.current?.style.setProperty("--fallback-x", tilt.pitch + "deg");
        root.current?.style.setProperty("--fallback-y", tilt.yaw + "deg");
      }
    }
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    if (active.hit.sticker) {
      if (active.moved) props.onStickerCommit?.();
      return;
    }
    if (active.moved || cancelled || !active.hit.slug) return;
    if (active.hit.slug === props.draft.template) {
      props.onToggle?.();
    } else {
      fallbackRotation.current = { pitch: 0, yaw: 0 };
      root.current?.style.removeProperty("--fallback-x");
      root.current?.style.removeProperty("--fallback-y");
      props.onTemplateSelect?.(active.hit.slug);
    }
  }

  const canToggle = !!props.onToggle && (!props.envelope || props.envelope === "none" || props.envelope === "opened");
  return (
    <div
      ref={root}
      className={`birthday-scene relative h-full w-full touch-none cursor-grab active:cursor-grabbing ${props.className ?? ""}`}
      role={canToggle ? "button" : "img"}
      tabIndex={canToggle ? 0 : undefined}
      aria-label={canToggle ? (props.open ? "合上贺卡" : "翻开贺卡") : "三维生日信预览"}
      aria-pressed={canToggle ? Boolean(props.open) : undefined}
      onKeyDown={(event) => {
        if (canToggle && (event.key === " " || event.key === "Enter")) {
          event.preventDefault();
          props.onToggle?.();
        }
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={(event) => pointerEnd(event)}
      onPointerCancel={(event) => pointerEnd(event, true)}
      onLostPointerCapture={(event) => pointerEnd(event, true)}
    >
      <div ref={host} className="absolute inset-0" aria-hidden="true" />
      {!gpu && <Fallback {...props} />}
    </div>
  );
}
