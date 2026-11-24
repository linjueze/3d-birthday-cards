"use client";

import { useEffect, useRef } from "react";
import { COVER_PREVIEW_DATA_URI, stickerArt } from "@/lib/art";
import type { StickerId, TemplateSlug } from "@/lib/cards";

export function CardThumb({ slug }: { slug: TemplateSlug }) {
  return (
    <img
      src={COVER_PREVIEW_DATA_URI[slug]}
      width={240}
      height={320}
      alt=""
      decoding="sync"
      className="card-thumb"
      aria-hidden="true"
    />
  );
}

export function StickerThumb({ type }: { type: StickerId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (canvas) canvas.getContext("2d")?.drawImage(stickerArt(type), 0, 0, canvas.width, canvas.height);
  }, [type]);
  return <canvas ref={ref} width={100} height={100} className="sticker-thumb" aria-hidden="true" />;
}
