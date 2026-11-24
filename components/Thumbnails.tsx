"use client";

import { useEffect, useRef } from "react";
import { coverArt, COVER_MANIFEST, loadCoverArt, stickerArt } from "@/lib/art";
import type { StickerId, TemplateSlug } from "@/lib/cards";

export function CardThumb({ slug }: { slug: TemplateSlug }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = (image: HTMLCanvasElement) => canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    paint(coverArt(slug).composite);
    let current = true;
    if (COVER_MANIFEST[slug].maps) void loadCoverArt(slug).then(({ composite }) => { if (current) paint(composite); });
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
