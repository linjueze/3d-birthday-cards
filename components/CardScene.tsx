"use client";

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { COVER_MANIFEST, COVER_PREVIEW_DATA_URI, coverArt, getInitialCoverBase, insideArt, linerArt, loadCoverBase, loadCoverPreview, loadInsideArt, STICKER_BASE_SIZE, stickerArt } from "@/lib/art";
import { TEMPLATES, WAX_OPTIONS, type TemplateSlug } from "@/lib/cards";
import { createStage, FALLBACK_TIMINGS, GALLERY_SLOTS, galleryOffset, MAX_ZOOM, MIN_ZOOM, type SceneHit, type SceneProps, type SceneStage } from "@/lib/scene-stage";
import "@/lib/scene-fallback.css";

type ActiveGesture = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  hit: SceneHit;
  moved: boolean;
  panning: boolean;
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
  const hasExternal = Object.keys(COVER_MANIFEST[slug].maps ?? {}).length > 0;
  const [replacement, setReplacement] = useState<{ slug: TemplateSlug; canvas: HTMLCanvasElement }>();
  useEffect(() => {
    if (!hasExternal) return;
    let current = true;
    let upgraded = false;
    void loadCoverPreview(slug).then((preview) => {
      if (current && !upgraded && preview) setReplacement({ slug, canvas: preview });
    }).catch(() => undefined);
    void loadCoverBase(slug, "high").then((canvas) => {
      if (!current) return;
      upgraded = true;
      setReplacement({ slug, canvas: canvas ?? coverArt(slug).composite });
    }).catch(() => undefined);
    return () => { current = false; };
  }, [hasExternal, slug]);
  if (hasExternal && replacement?.slug !== slug && COVER_PREVIEW_DATA_URI[slug]) {
    return <img src={COVER_PREVIEW_DATA_URI[slug]} alt="" aria-hidden="true" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />;
  }
  return <PaintedCanvas image={replacement?.slug === slug ? replacement.canvas : (hasExternal ? getInitialCoverBase(slug) : coverArt(slug).composite)} />;
}

function Fallback({ draft, mode, envelope, open, sealProgress, selectedSticker }: SceneProps) {
  const [mounted, setMounted] = useState(false);
  const [fontVersion, setFontVersion] = useState(0);
  useEffect(() => {
    setMounted(true);
    const refresh = () => setFontVersion((version) => version + 1);
    document.fonts?.addEventListener("loadingdone", refresh);
    void loadInsideArt(draft.template).then((img) => { if (img) refresh(); });
    return () => document.fonts?.removeEventListener("loadingdone", refresh);
  }, [draft.template]);

  if (!mounted) return null;
  const gallery = mode === "gallery";
  const packPhase = envelope === "packing" || envelope === "breaking";
  const envelopeVisible = !!envelope && envelope !== "none" && envelope !== "opened";
  const waxPreset = WAX_OPTIONS.find((item) => item.id === draft.wax) ?? WAX_OPTIONS[0];
  return (
    <div className="scene-fallback" data-phase={envelope ?? "none"} style={{ "--wax-color": waxPreset.color, "--wax-stamp": waxPreset.stamp } as CSSProperties} aria-hidden="true">
      {gallery && TEMPLATES.filter((template) => template.slug !== draft.template).map((template) => {
        const slot = GALLERY_SLOTS[galleryOffset(template.slug, draft.template)];
        const style = {
          "--slot-x": slot.x,
          "--slot-y": slot.y,
          "--slot-z": Math.round(slot.z * 60) + "px",
          "--slot-yaw": slot.yaw + "rad",
          "--slot-roll": slot.roll + "rad",
          "--slot-scale": slot.scale,
          zIndex: Math.round(slot.z * 100) + 500,
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
                    style={{
                      left: sticker.x * 100 + "%",
                      top: sticker.y * 100 + "%",
                      width: STICKER_BASE_SIZE * sticker.scale * 100 + "%",
                      transform: sticker.rotation ? `rotate(${sticker.rotation}deg)` : undefined,
                    }}
                  />
                ))}
              </>
            )}
          </div>
          <div className="scene-fallback-cover">
            <div className="scene-fallback-front"><FallbackCover slug={draft.template} /></div>
            <div className="scene-fallback-left">
              {open && !envelopeVisible && <PaintedCanvas key={fontVersion} image={insideArt(draft, "left", false)} />}
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
            <div className="scene-envelope-stamp"><span>{waxPreset.glyph}</span><span>{waxPreset.glyph}</span></div>
          ) : (
            <div className="scene-envelope-molten" style={{ "--seal-progress": envelope === "unsealed" ? Math.max(.26, sealProgress ?? 0) : (sealProgress ?? 0) } as CSSProperties} />
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
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const stage = useRef<SceneStage | undefined>(undefined);
  const fallbackRotation = useRef({ pitch: 0, yaw: 0 });
  const fallbackZoom = useRef({ scale: 1, x: 0, y: 0 });
  const [gpu, setGpu] = useState(false);
  const [zoom, setZoom] = useState(1);
  const draggingStickerRef = useRef<string | null>(null);
  const canZoom = !props.envelope || props.envelope === "none" || props.envelope === "opened";

  useLayoutEffect(() => {
    latest.current = { ...props, draggingSticker: draggingStickerRef.current };
  }, [props]);

  function applyFallbackView(nextScale: number, nextX = fallbackZoom.current.x, nextY = fallbackZoom.current.y) {
    const clamped = Math.round(limit(nextScale, MIN_ZOOM, MAX_ZOOM) * 100) / 100;
    const maxOffset = Math.max(0, (clamped - 1) * 190);
    const x = clamped <= 1.01 ? 0 : limit(nextX, -maxOffset, maxOffset);
    const y = clamped <= 1.01 ? 0 : limit(nextY, -maxOffset, maxOffset);
    fallbackZoom.current = { scale: clamped, x, y };
    root.current?.style.setProperty("--fallback-zoom", String(clamped));
    root.current?.style.setProperty("--fallback-pan-x", `${x}px`);
    root.current?.style.setProperty("--fallback-pan-y", `${y}px`);
    setZoom(clamped);
    return clamped;
  }

  function applyZoomTo(target: number) {
    if (!canZoom) return;
    if (gpu && stage.current) {
      stage.current.zoomTo(target);
    } else {
      applyFallbackView(target);
    }
  }

  function applyZoomBy(factor: number) {
    if (!canZoom) return;
    if (gpu && stage.current) {
      stage.current.zoomBy(factor);
    } else {
      applyFallbackView(fallbackZoom.current.scale * factor);
    }
  }

  function resetView() {
    if (gpu && stage.current) {
      stage.current.resetView();
    } else {
      fallbackRotation.current = { pitch: 0, yaw: 0 };
      root.current?.style.removeProperty("--fallback-x");
      root.current?.style.removeProperty("--fallback-y");
      applyFallbackView(1, 0, 0);
    }
  }

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const updateWax = (xPct: number, yPct: number) => {
      const target = root.current?.parentElement ?? root.current;
      target?.style.setProperty("--wax-x", `${xPct}%`);
      target?.style.setProperty("--wax-y", `${yPct}%`);
    };
    stage.current = createStage(element, () => latest.current, setGpu, setZoom, updateWax);
    return () => {
      stage.current?.destroy();
      stage.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (!canZoom || !gpu) {
      if (!canZoom) applyFallbackView(1, 0, 0);
    }
  }, [canZoom, gpu]);

  useEffect(() => {
    if (!gpu) {
      fallbackRotation.current = { pitch: 0, yaw: 0 };
      root.current?.style.removeProperty("--fallback-x");
      root.current?.style.removeProperty("--fallback-y");
      applyFallbackView(1, 0, 0);
    }
  }, [props.draft.template, gpu]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const env = latest.current.envelope;
      if (env && env !== "none" && env !== "opened") return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * .0016);
      if (stage.current) stage.current.zoomBy(factor);
      else applyFallbackView(fallbackZoom.current.scale * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (gpu || props.envelope !== "packing" && props.envelope !== "breaking") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => latest.current.onReady?.(), reduced ? 125 : FALLBACK_TIMINGS[props.envelope]);
    return () => window.clearTimeout(timeout);
  }, [gpu, props.envelope]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".scene-zoom-bar")) return;
    touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.current.size === 2 && canZoom) {
      const [a, b] = [...touches.current.values()];
      pinchStart.current = { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, zoom };
      gesture.current = null;
      return;
    }
    const isRightPan = event.button === 2 && zoom > 1.02;
    if ((event.button !== 0 && !isRightPan) || gesture.current) return;
    const { clientX, clientY, pointerId, currentTarget } = event;
    const hit = gpu && stage.current ? stage.current.hit(clientX, clientY) : fallbackHit(event.target as HTMLElement, currentTarget, props, clientX, clientY);
    const touchPan = event.pointerType === "touch" && zoom > 1.05 && !hit.sticker;
    const panning = canZoom && zoom > 1.02 && (isRightPan || event.shiftKey || touchPan);
    gesture.current = { id: pointerId, startX: clientX, startY: clientY, lastX: clientX, lastY: clientY, hit, moved: false, panning };
    if (hit.sticker && !panning) props.onStickerSelect?.(hit.sticker);
    currentTarget.setPointerCapture(pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.current.size === 2 && pinchStart.current && canZoom) {
        const [a, b] = [...touches.current.values()];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        applyZoomTo(pinchStart.current.zoom * (dist / pinchStart.current.dist));
        return;
      }
    }
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.lastX;
    const dy = event.clientY - active.lastY;
    if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) <= 4) return;
    active.lastX = event.clientX;
    active.lastY = event.clientY;
    active.moved = true;

    if (active.panning) {
      if (gpu && stage.current) {
        stage.current.pan(dx, dy);
      } else {
        applyFallbackView(fallbackZoom.current.scale, fallbackZoom.current.x + dx, fallbackZoom.current.y + dy);
      }
      return;
    }

    if (active.hit.sticker && props.onStickerMove) {
      if (draggingStickerRef.current !== active.hit.sticker) {
        draggingStickerRef.current = active.hit.sticker;
        latest.current = { ...latest.current, draggingSticker: active.hit.sticker };
      }
      const p = gpu && stage.current ? stage.current.paperPoint(event.clientX, event.clientY) : fallbackPoint(root, event.clientX, event.clientY);
      if (p) {
        const currentSticker = props.draft.stickers.find((item) => item.id === active.hit.sticker);
        const scale = currentSticker?.scale ?? 1;
        const padX = Math.max(.12, STICKER_BASE_SIZE * scale * .58 + .02);
        const padY = Math.max(.10, STICKER_BASE_SIZE * scale * .44 + .02);
        const x = limit(p.x - (active.hit.x ?? 0), padX, 1 - padX);
        const y = limit(p.y - (active.hit.y ?? 0), padY, 1 - padY);
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
    touches.current.delete(event.pointerId);
    if (touches.current.size < 2) pinchStart.current = null;
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    if (active.panning) return;
    if (active.hit.sticker) {
      if (draggingStickerRef.current) {
        draggingStickerRef.current = null;
        latest.current = { ...latest.current, draggingSticker: null };
      }
      if (active.moved) props.onStickerCommit?.();
      return;
    }
    if (active.moved || cancelled || !active.hit.slug) return;
    if (active.hit.slug === props.draft.template) {
      if (props.mode === "editor" && props.open && (active.hit.area === "left" || active.hit.area === "right") && props.onPageClick) {
        props.onPageClick(active.hit.area);
      } else {
        props.onToggle?.();
      }
    } else {
      fallbackRotation.current = { pitch: 0, yaw: 0 };
      root.current?.style.removeProperty("--fallback-x");
      root.current?.style.removeProperty("--fallback-y");
      applyFallbackView(1, 0, 0);
      props.onTemplateSelect?.(active.hit.slug);
    }
  }

  const canToggle = !!props.onToggle && canZoom;
  const zoomPercent = Math.round(zoom * 100);
  return (
    <div
      ref={root}
      className={`birthday-scene relative h-full w-full ${props.className ?? ""}`}
      onContextMenu={(event) => { if (zoom > 1.02) event.preventDefault(); }}
    >
      <div
        className="birthday-scene-surface absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
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
      {canZoom && (
        <div
          className={`scene-zoom-bar glass ${zoom > 1.02 ? "is-zoomed" : ""}`}
          role="group"
          aria-label="贺卡缩放控制"
        >
          <button type="button" className="icon-btn" aria-label="缩小" title="缩小" disabled={zoom <= MIN_ZOOM + .01} onClick={() => applyZoomBy(1 / 1.25)}><ZoomOut size={15} /></button>
          <button type="button" className="scene-zoom-pct" aria-label="重置缩放" title="点击复位视角" onClick={resetView}>{zoomPercent}%</button>
          <button type="button" className="icon-btn" aria-label="放大查看细节" title="放大查看细节" disabled={zoom >= MAX_ZOOM - .01} onClick={() => applyZoomBy(1.25)}><ZoomIn size={15} /></button>
          {zoom > 1.02 && (
            <button type="button" className="icon-btn" aria-label="复位视角" title="复位视角" onClick={resetView}><RotateCcw size={14} /></button>
          )}
        </div>
      )}
    </div>
  );
}
