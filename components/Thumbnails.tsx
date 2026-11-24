"use client";

import { useEffect, useRef } from "react";
import { coverArt, COVER_MANIFEST, getCachedCoverBase, loadCoverBase, placeholderCoverArt, stickerArt } from "@/lib/art";
import type { StickerId, TemplateSlug } from "@/lib/cards";

export function CardThumb({ slug }: { slug: TemplateSlug }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = (image: HTMLCanvasElement) => canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const hasMaps = Boolean(COVER_MANIFEST[slug].maps?.base);
    const ready = hasMaps ? getCachedCoverBase(slug) : undefined;
    paint(ready ?? (hasMaps ? placeholderCoverArt(slug).base : coverArt(slug).composite));
    if (!hasMaps || ready) return;
    let current = true;
    void loadCoverBase(slug, "low").then((base) => {
      if (current) paint(base ?? coverArt(slug).composite);
    });
    return () => { current = false; };
  }, [slug]);
  return <canvas ref={ref} width={150} height={198} className="card-thumb" aria-hidden="true" />;
}

export function StickerThumb({ type }: { type: StickerId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (canvas) canvas.getContext("2d")?.drawImage(stickerArt(type), 0, 0, canvas.width, canvas.height);
  }, [type]);
  return <canvas ref={ref} width={100} height={100} className="sticker-thumb" aria-hidden="true" />;
}
