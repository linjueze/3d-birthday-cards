import type { CardDraft, FontId, PaperId, TemplateSlug } from "./cards";
import { coverBase, coverFoil, coverIllustration, coverPalette, drawPaperGrain } from "./art-covers";
import { ART_HEIGHT, ART_WIDTH, drawPath, ellipse, gold, gradient, randomFrom, spacedText, star, surface } from "./art-ornaments";
import { STICKER_BASE_SIZE, stickerArt } from "./art-stickers";

export { STICKER_BASE_SIZE, stickerArt };

export interface CoverArt {
  base: HTMLCanvasElement;
  illustration: HTMLCanvasElement;
  foil: HTMLCanvasElement;
  height: HTMLCanvasElement;
  composite: HTMLCanvasElement;
}

export interface CoverMaterialManifest {
  procedural: (slug: TemplateSlug) => CoverArt;
  /** WebP URLs use identical framing to the procedural artwork. */
  maps?: Partial<Record<keyof CoverArt, string>>;
}

function coverMaps(slug: TemplateSlug): Partial<Record<keyof CoverArt, string>> {
  const root = `/assets/cards/${slug}`;
  return {
    base: `${root}/base.webp`,
    illustration: `${root}/relief.webp`,
    foil: `${root}/foil.webp`,
    height: `${root}/height.webp`,
    composite: `${root}/base.webp`,
  };
}

export const COVER_MANIFEST: Record<TemplateSlug, CoverMaterialManifest> = {
  "candlelight-cake": { procedural: coverArt, maps: coverMaps("candlelight-cake") },
  "starry-wish": { procedural: coverArt, maps: coverMaps("starry-wish") },
  "bloom-garden": { procedural: coverArt, maps: coverMaps("bloom-garden") },
  "confetti-atelier": { procedural: coverArt, maps: coverMaps("confetti-atelier") },
};

const covers = new Map<TemplateSlug, CoverArt>();
const loadedCovers = new Map<TemplateSlug, Promise<CoverArt>>();

function heightLayer(ctx: CanvasRenderingContext2D, mask: HTMLCanvasElement, color: string) {
  const layer = surface();
  layer.ctx.drawImage(mask, 0, 0);
  layer.ctx.globalCompositeOperation = "source-in";
  layer.ctx.fillStyle = color;
  layer.ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  ctx.drawImage(layer.canvas, 0, 0);
}

export function coverArt(slug: TemplateSlug): CoverArt {
  const cached = covers.get(slug);
  if (cached) return cached;
  const base = surface();
  const illustration = surface();
  const foil = surface();
  const height = surface();
  coverBase(base.ctx, slug);
  coverIllustration(illustration.ctx, slug);
  coverFoil(foil.ctx, slug);
  height.ctx.fillStyle = "#000000";
  height.ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  heightLayer(height.ctx, illustration.canvas, "#a6a6a6");
  heightLayer(height.ctx, foil.canvas, "#f3f3f3");
  let preview: HTMLCanvasElement | undefined;
  const artwork = {
    base: base.canvas,
    illustration: illustration.canvas,
    foil: foil.canvas,
    height: height.canvas,
    get composite() {
      if (!preview) {
        const composition = surface();
        composition.ctx.drawImage(base.canvas, 0, 0);
        composition.ctx.drawImage(illustration.canvas, 0, 0);
        composition.ctx.drawImage(foil.canvas, 0, 0);
        preview = composition.canvas;
      }
      return preview;
    },
  };
  covers.set(slug, artwork);
  return artwork;
}

async function renderExternalLayer(url: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  try {
    await image.decode();
    const { canvas, ctx } = surface();
    ctx.drawImage(image, 0, 0, ART_WIDTH, ART_HEIGHT);
    return canvas;
  } catch {
    return undefined;
  }
}

export function loadCoverArt(slug: TemplateSlug): Promise<CoverArt> {
  const manifest = COVER_MANIFEST[slug];
  const procedural = manifest.procedural(slug);
  const entries = Object.entries(manifest.maps ?? {}) as [keyof CoverArt, string][];
  if (!entries.length) return Promise.resolve(procedural);
  const cached = loadedCovers.get(slug);
  if (cached) return cached;

  const result = Promise.all(entries.map(async ([name, url]) => [name, await renderExternalLayer(url)] as const))
    .then((layers) => {
      const overrides = Object.fromEntries(layers) as Partial<CoverArt>;
      const base = overrides.base ?? procedural.base;
      const illustration = overrides.illustration ?? procedural.illustration;
      const foil = overrides.foil ?? procedural.foil;
      let composite = overrides.composite;
      if (!composite) {
        const composition = surface();
        for (const layer of [base, illustration, foil]) composition.ctx.drawImage(layer, 0, 0);
        composite = composition.canvas;
      }
      return { base, illustration, foil, height: overrides.height ?? procedural.height, composite };
    });
  loadedCovers.set(slug, result);
  return result;
}

const paperPalette = {
  watercolor: { start: "#fff5e6", end: "#eadcc6", field: "#fff9ed", ink: "#584033", edge: "#cdb998", normal: .54, roughness: 209, grain: 1 },
  kraft: { start: "#e6c29b", end: "#bb906a", field: "#f0d3ac", ink: "#4a3329", edge: "#9f784f", normal: .91, roughness: 226, grain: 1.35 },
  pearl: { start: "#fff9f3", end: "#e4d7df", field: "#fff9f3", ink: "#563c48", edge: "#bfa9b1", normal: .34, roughness: 172, grain: .65 },
} as const;

const mapCache = new Map<PaperId, { normal: HTMLCanvasElement; roughness: HTMLCanvasElement }>();

export function paperMaps(id: PaperId) {
  const previous = mapCache.get(id);
  if (previous) return previous;
  const palette = paperPalette[id];
  const size = 256;
  const normal = surface(size, size);
  const roughness = surface(size, size);
  const normalData = normal.ctx.createImageData(size, size);
  const roughnessData = roughness.ctx.createImageData(size, size);
  const random = randomFrom(4461 + Math.round(palette.normal * 440));
  const heightmap = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const fiber = Math.sin(x * .23 + Math.sin(y * .085) * 3) * .18;
      const network = .27 * Math.sin(x * 1.02 + y * .21) * Math.cos(y * .45 - x * .18);
      heightmap[index] = (random() - .5 + fiber + network) * palette.normal;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const dx = heightmap[y * size + (x + 1) % size] - heightmap[y * size + (x + size - 1) % size];
      const dy = heightmap[((y + 1) % size) * size + x] - heightmap[((y + size - 1) % size) * size + x];
      const magnitude = Math.hypot(dx, dy, 1);
      const tone = palette.roughness + heightmap[index] * 39;
      normalData.data.set([128 - dx / magnitude * 127, 128 + dy / magnitude * 127, 128 + 127 / magnitude, 255], index * 4);
      roughnessData.data.set([tone, tone, tone, 255], index * 4);
    }
  }
  normal.ctx.putImageData(normalData, 0, 0);
  roughness.ctx.putImageData(roughnessData, 0, 0);
  const maps = { normal: normal.canvas, roughness: roughness.canvas };
  mapCache.set(id, maps);
  return maps;
}

const paperCache = new Map<string, HTMLCanvasElement>();

function interiorPaper(id: PaperId, side: "left" | "right") {
  const key = `${id}-${side}`;
  const cached = paperCache.get(key);
  if (cached) return cached;
  const palette = paperPalette[id];
  const { canvas, ctx } = surface();
  ctx.fillStyle = gradient(ctx, side === "left" ? 20 : 735, 20, side === "left" ? 740 : 21, 986, [[0, palette.start], [.56, palette.start], [1, palette.end]]);
  ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  if (side === "right") {
    ctx.save();
    ctx.shadowColor = "#6448323f";
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 12;
    drawPath(ctx, "M 56 59 H 711 V 965 H 56Z", palette.field, palette.edge, 1.2);
    ctx.restore();
    drawPath(ctx, "M 69 71 H 699 V 953 H 69Z", undefined, "#d6bd957e", 1.2);
    drawPath(ctx, "M 76 78 H 692 V 946 H 76Z", undefined, "#fff7e791", 1);
  } else {
    drawPath(ctx, "M 57 59 H 711 V 965 H 57Z", undefined, "#c5aa83a0", 1.8);
    drawPath(ctx, "M 69 71 H 699 V 953 H 69Z", undefined, "#fff6dcaf", 1.4);
  }
  drawPaperGrain(ctx, ART_WIDTH, ART_HEIGHT, 12700, 6619, palette.grain);
  const gutter = side === "left" ? gradient(ctx, 635, 0, 768, 0, [[0,"#614b3100"],[.84,"#62432e13"],[1,"#654a2e24"]])
    : gradient(ctx, 0, 0, 133, 0, [[0,"#654a2e24"],[.16,"#62432e13"],[1,"#614b3100"]]);
  ctx.fillStyle = gutter;
  ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  paperCache.set(key, canvas);
  return canvas;
}

const marks: Record<TemplateSlug, string> = {
  "candlelight-cake": "M -70 49 Q 0 62 70 49 M -58 45 V -17 Q 0 -37 58 -17 V 45 M -58 6 Q -41 16 -32 4 Q -23 3 -16 15 Q -7 24 0 10 Q 7 4 16 15 Q 23 20 32 7 Q 45 0 57 4 M -29 -20 V -51 H -21 V -23 M -4 -27 V -59 H 4 V -27 M 21 -23 V -51 H 29 V -20 M -25 -54 q -9 -5 2 -17 q 8 11 -2 17 m 25 -8 q -12 -5 2 -18 q 9 13 -2 18 m 25 8 q -9 -5 2 -17 q 8 11 -2 17",
  "starry-wish": "M 24 -68 C -18 -82 -67 -56 -71 -10 C -77 47 -32 75 9 65 C 37 58 58 36 61 20 C 14 43 -30 13 -31 -22 C -32 -45 -8 -64 24 -68Z M 33 -27 l 6 15 l 15 6 l -15 6 l -6 15 l -6 -15 l -15 -6 l 15 -6Z",
  "bloom-garden": "M -60 -30 H 60 V 44 H -60 Z M -60 -30 L 0 16 L 60 -30 M -60 44 L -22 2 M 60 44 L 22 2 M -7 9 C -18 2 -19 -11 -12 -22 C -4 -17 2 -13 0 -3 M 7 9 C 18 2 19 -11 12 -22 C 4 -17 -2 -13 0 -3 M -25 -38 C -58 -44 -61 -62 -58 -68 C -50 -71 -28 -57 -25 -38 M 25 -38 C 58 -44 61 -62 58 -68 C 50 -71 28 -57 25 -38",
  "confetti-atelier": "M -56 52 V -15 H 56 V 52Z M -61 -15 V -35 H 61 V -15 M -9 -35 V 52 M 9 -35 V 52 M 0 -35 C -14 -71 -46 -76 -45 -57 C -43 -41 -17 -34 0 -35 C 14 -71 46 -76 45 -57 C 43 -41 17 -34 0 -35Z",
};

function engravedMark(ctx: CanvasRenderingContext2D, slug: TemplateSlug, x: number, y: number, size: number, tint: string | CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 160, size / 160);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawPath(ctx, marks[slug], undefined, "#fff4dbaa", 4.5);
  ctx.translate(0, -1.4);
  drawPath(ctx, marks[slug], undefined, tint, 2.2);
  ctx.restore();
}

function dateStamp(ctx: CanvasRenderingContext2D, date: string, color: string) {
  ctx.save();
  ctx.translate(384, 766);
  ctx.rotate(-.08);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(-126, -33, 252, 65);
  ctx.setLineDash([]);
  ctx.strokeRect(-120, -27, 240, 53);
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.font = '23px "Inter", Arial, sans-serif';
  spacedText(ctx, date.replaceAll("-", " · "), 0, 1, 2.2);
  ctx.restore();
}

function drawEmblem(ctx: CanvasRenderingContext2D, draft: CardDraft) {
  const palette = paperPalette[draft.paper];
  const metallic = gold(ctx, 291, 631);
  const centerX = 384;
  const centerY = 484;
  const emblem = ctx.createRadialGradient(326, 410, 25, centerX, centerY, 170);
  emblem.addColorStop(0, palette.start);
  emblem.addColorStop(.82, palette.start);
  emblem.addColorStop(1, palette.end);
  ellipse(ctx, centerX, centerY + 5, 174, 178, "#8b674638");
  ellipse(ctx, centerX, centerY, 172, 174, emblem, metallic, 2.6);
  ellipse(ctx, centerX, centerY, 156, 158, undefined, "#ffffea9a", 2.6);
  ellipse(ctx, centerX, centerY, 150, 152, undefined, metallic, 1.4);
  for (let index = 0; index < 56; index++) {
    const radians = index * Math.PI / 28;
    const x = centerX + Math.cos(radians) * 137;
    const y = centerY + Math.sin(radians) * 139;
    ellipse(ctx, x, y, index % 4 === 0 ? 2.2 : 1.3, index % 4 === 0 ? 2.2 : 1.3, metallic);
  }
  engravedMark(ctx, draft.template, centerX, centerY - 4, 206, metallic);
  for (const [x, y, radius] of [[384,286,12],[384,682,12],[186,484,12],[582,484,12],[480,386,8],[292,386,8],[292,578,8],[480,578,8]]) star(ctx, x, y, radius, metallic, 4, .84);
}

export function insideEmblemArt(draft: CardDraft) {
  const { canvas, ctx } = surface();
  drawEmblem(ctx, draft);
  return canvas;
}

function insideLeft(ctx: CanvasRenderingContext2D, draft: CardDraft, includeEmblem: boolean) {
  const palette = paperPalette[draft.paper];
  if (includeEmblem) drawEmblem(ctx, draft);
  ctx.save();
  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = .68;
  ctx.font = '22px Georgia, serif';
  spacedText(ctx, "WITH LOVE", 384, 240, 6);
  ctx.restore();
  if (draft.birthday) dateStamp(ctx, draft.birthday, draft.paper === "kraft" ? "#8b533c" : "#a06959");
}

const fontFamily: Record<FontId, string> = {
  "long-cang": '"Long Cang", "KaiTi", "STKaiti", cursive',
  caveat: '"Caveat", "Segoe Print", "Long Cang", "KaiTi", cursive',
  serif: '"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif',
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? []) {
      if (ctx.measureText(line + word).width > width && line.trim()) {
        lines.push(line.trimEnd());
        line = "";
      }
      if (ctx.measureText(word).width > width) {
        for (const char of word) {
          if (ctx.measureText(line + char).width > width) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      } else {
        line += line ? word : word.trimStart();
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function bodyLayout(ctx: CanvasRenderingContext2D, draft: CardDraft, width: number, height: number) {
  const family = fontFamily[draft.font];
  const start = draft.font === "serif" ? 31 : 44;
  const saneBreaks = draft.message.trim().replace(/\n{3,}/g, "\n\n");
  const texts = [saneBreaks, saneBreaks.replace(/\s*\r?\n\s*/g, " ")];
  for (const text of texts) {
    for (let size = start; size >= 13; size--) {
      ctx.font = `${size}px ${family}`;
      const lines = wrapText(ctx, text, width);
      const lineHeight = size * (draft.font === "serif" ? 1.52 : 1.35);
      if (lines.length * lineHeight <= height) return { lines, lineHeight };
    }
  }
  ctx.font = `12px ${family}`;
  return { lines: wrapText(ctx, texts[1], width), lineHeight: 15 };
}

function insideRight(ctx: CanvasRenderingContext2D, draft: CardDraft, includeStickers: boolean) {
  const palette = paperPalette[draft.paper];
  const paperInk = palette.ink;
  const metallic = gold(ctx, 180, 903);
  ctx.fillStyle = paperInk;
  const family = fontFamily[draft.font];
  ctx.font = `${draft.font === "serif" ? 42 : 56}px ${family}`;
  ctx.fillText(`Dear ${draft.recipient.trim() || "…"}`, 122, 190, 523);
  drawPath(ctx, "M 124 213 H 642", undefined, "#ba987558", 1.2);

  if (draft.message.trim()) {
    const { lines, lineHeight } = bodyLayout(ctx, draft, 520, 490);
    lines.forEach((line, index) => ctx.fillText(line, 124, 269 + index * lineHeight, 520));
  } else {
    ctx.save();
    ctx.setLineDash([1.6, 4.8]);
    for (const y of [290, 360, 430, 500]) drawPath(ctx, `M 126 ${y} H 641`, undefined, "#ba987542", 1.25);
    ctx.restore();
  }
  if (draft.sender.trim()) {
    ctx.font = `${draft.font === "serif" ? 31 : 43}px ${family}`;
    ctx.textAlign = "right";
    ctx.fillText(`— ${draft.sender.trim()}`, 639, 805, 480);
    ctx.textAlign = "left";
  }
  drawPath(ctx, "M 297 890 Q 336 874 361 889 Q 327 896 314 889 M 471 890 Q 432 874 407 889 Q 441 896 454 889", undefined, metallic, 1.8);
  star(ctx, 384, 888, 16, metallic, 4, .8);
  if (includeStickers) {
    for (const sticker of draft.stickers) {
      const size = ART_WIDTH * STICKER_BASE_SIZE * sticker.scale;
      ctx.drawImage(stickerArt(sticker.type), sticker.x * ART_WIDTH - size / 2, sticker.y * ART_HEIGHT - size / 2, size, size);
    }
  }
}

export function insideArt(draft: CardDraft, side: "left" | "right", includeStickers = true, includeEmblem = true) {
  const { canvas, ctx } = surface();
  ctx.drawImage(interiorPaper(draft.paper, side), 0, 0);
  if (side === "left") insideLeft(ctx, draft, includeEmblem);
  else insideRight(ctx, draft, includeStickers);
  return canvas;
}

let cachedLiner: HTMLCanvasElement | undefined;

export function linerArt() {
  if (cachedLiner) return cachedLiner;
  const { canvas, ctx } = surface(768, 512);
  ctx.fillStyle = gradient(ctx, 91, 0, 679, 539, [[0, "#421a2b"], [.42, "#773545"], [.66, "#672537"], [1, "#4c1e32"]]);
  ctx.fillRect(0, 0, 768, 512);
  drawPaperGrain(ctx, 768, 512, 11300, 9365, .85);
  const metallic = gold(ctx, 10, 506, true);
  const random = randomFrom(7478);
  for (let y = 8; y < 533; y += 30) {
    for (let x = -8; x < 798; x += 31) {
      const shift = y % 60 === 8 ? 14 : 0;
      const size = 2.7 + random() * 4.6;
      ctx.globalAlpha = .49 + random() * .51;
      const left = x + shift + (random() - .5) * 8;
      const top = y + (random() - .5) * 8;
      if (random() > .38) star(ctx, left, top, size, metallic, 4, .82);
      else ellipse(ctx, left, top, Math.max(1, size * .27), Math.max(1, size * .27), metallic);
    }
  }
  ctx.globalAlpha = 1;
  drawPath(ctx, "M 17 18 H 751 V 494 H 17Z M 26 27 H 742 V 485 H 26Z", undefined, metallic, 1.75);
  cachedLiner = canvas;
  return canvas;
}
