import { INK_OPTIONS, type CardDraft, type FontId, type PaperId, type TemplateSlug } from "./cards";
import { coverBase, coverFoil, coverIllustration, coverPalette, drawPaperGrain } from "./art-covers";
import { ART_HEIGHT, ART_WIDTH, drawPath, ellipse, gold, gradient, randomFrom, spacedText, star, surface } from "./art-ornaments";
import { STICKER_BASE_SIZE, stickerArt } from "./art-stickers";
import { COVER_PREVIEW_DATA_URI, INSIDE_PREVIEW_DATA_URI } from "./cover-previews";
import { withBasePath } from "./share-codec";

export { COVER_PREVIEW_DATA_URI, STICKER_BASE_SIZE, stickerArt };

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
  const root = withBasePath(`/assets/cards/${slug}`);
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
  "sakura-mail": { procedural: coverArt, maps: coverMaps("sakura-mail") },
  "teddy-birthday": { procedural: coverArt, maps: coverMaps("teddy-birthday") },
  "atelier-tea": { procedural: coverArt, maps: coverMaps("atelier-tea") },
};

const covers = new Map<TemplateSlug, CoverArt>();
const placeholders = new Map<TemplateSlug, CoverArt>();
const previewCanvases = new Map<TemplateSlug, HTMLCanvasElement>();
const loadedPreviews = new Map<TemplateSlug, Promise<HTMLCanvasElement | undefined>>();
const cachedBase = new Map<TemplateSlug, HTMLCanvasElement>();
const loadedBase = new Map<TemplateSlug, Promise<HTMLCanvasElement | undefined>>();
const loadedCovers = new Map<TemplateSlug, Promise<CoverArt>>();
const insidePreviews = new Map<TemplateSlug, HTMLCanvasElement>();
const loadedInsidePreviews = new Map<TemplateSlug, Promise<HTMLCanvasElement | undefined>>();
const insideImages = new Map<TemplateSlug, HTMLCanvasElement>();
const loadedInside = new Map<TemplateSlug, Promise<HTMLCanvasElement | undefined>>();

function rasterizeImage(image: HTMLImageElement): HTMLCanvasElement {
  const { canvas, ctx } = surface(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function decodeImage(url: string, priority: "high" | "low" | "auto" = "auto"): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    if (!url.startsWith("data:")) image.crossOrigin = "anonymous";
    if ("fetchPriority" in image && !url.startsWith("data:")) {
      (image as HTMLImageElement & { fetchPriority: string }).fetchPriority = priority;
    }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok && image.naturalWidth > 0 ? image : undefined);
    };
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().then(() => finish(true)).catch(() => finish(true));
      } else {
        finish(true);
      }
    };
    image.onerror = () => finish(false);
    image.src = url;
  });
}

export function getInsideImage(slug: TemplateSlug): HTMLCanvasElement | undefined {
  return insideImages.get(slug) ?? insidePreviews.get(slug);
}

export function loadInsidePreview(slug: TemplateSlug): Promise<HTMLCanvasElement | undefined> {
  const cached = insidePreviews.get(slug);
  if (cached) return Promise.resolve(cached);
  const existing = loadedInsidePreviews.get(slug);
  if (existing) return existing;
  const uri = INSIDE_PREVIEW_DATA_URI[slug];
  if (!uri) return Promise.resolve(undefined);
  const promise = decodeImage(uri).then((image) => {
    if (!image) {
      loadedInsidePreviews.delete(slug);
      return undefined;
    }
    const canvas = rasterizeImage(image);
    insidePreviews.set(slug, canvas);
    return canvas;
  });
  loadedInsidePreviews.set(slug, promise);
  return promise;
}

export function loadInsideArt(slug: TemplateSlug): Promise<HTMLCanvasElement | undefined> {
  const cached = insideImages.get(slug);
  if (cached) return Promise.resolve(cached);
  const existing = loadedInside.get(slug);
  if (existing) return existing;
  const promise = decodeImage(withBasePath(`/assets/cards/${slug}/inside.webp`), "auto").then((image) => {
    if (!image) {
      loadedInside.delete(slug);
      return undefined;
    }
    const canvas = rasterizeImage(image);
    insideImages.set(slug, canvas);
    return canvas;
  });
  loadedInside.set(slug, promise);
  return promise;
}

/** Lightweight cardstock placeholder used only during the ~2ms inline WebP decode window. */
export function placeholderCoverArt(slug: TemplateSlug): CoverArt {
  const cached = placeholders.get(slug);
  if (cached) return cached;
  const palette = coverPalette[slug];
  const base = surface(64, 85);
  base.ctx.fillStyle = gradient(base.ctx, 0, 0, 64, 85, [[0, palette.top], [.5, palette.middle], [1, palette.bottom]]);
  base.ctx.fillRect(0, 0, 64, 85);
  const empty = surface(2, 2);
  const flatHeight = surface(2, 2);
  flatHeight.ctx.fillStyle = "#000000";
  flatHeight.ctx.fillRect(0, 0, 2, 2);
  const artwork: CoverArt = {
    base: base.canvas,
    illustration: empty.canvas,
    foil: empty.canvas,
    height: flatHeight.canvas,
    composite: base.canvas,
  };
  placeholders.set(slug, artwork);
  return artwork;
}

export function loadCoverPreview(slug: TemplateSlug): Promise<HTMLCanvasElement | undefined> {
  const ready = previewCanvases.get(slug);
  if (ready) return Promise.resolve(ready);
  const existing = loadedPreviews.get(slug);
  if (existing) return existing;
  const uri = COVER_PREVIEW_DATA_URI[slug];
  if (!uri) return Promise.resolve(undefined);
  const promise = decodeImage(uri).then((image) => {
    if (!image) {
      loadedPreviews.delete(slug);
      return undefined;
    }
    const { canvas, ctx } = surface(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    previewCanvases.set(slug, canvas);
    return canvas;
  });
  loadedPreviews.set(slug, promise);
  return promise;
}

// Pre-decode all 4 tiny inline WebP cover & inside previews (~3-5ms total, zero network) right at
// module load so they are already sitting in memory synchronously when the 3D scene mounts.
if (typeof window !== "undefined") {
  for (const slug of Object.keys(COVER_PREVIEW_DATA_URI) as TemplateSlug[]) {
    void loadCoverPreview(slug);
    void loadInsidePreview(slug);
  }
}

export function getInitialCoverBase(slug: TemplateSlug): HTMLCanvasElement {
  return cachedBase.get(slug) ?? previewCanvases.get(slug) ?? placeholderCoverArt(slug).base;
}

export function isFullCoverBaseCached(slug: TemplateSlug): boolean {
  return cachedBase.has(slug);
}

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

async function renderExternalLayer(url: string, priority: "high" | "low" | "auto" = "auto") {
  const image = await decodeImage(url, priority);
  if (!image) return undefined;
  const { canvas, ctx } = surface();
  ctx.drawImage(image, 0, 0, ART_WIDTH, ART_HEIGHT);
  return canvas;
}

export function loadCoverBase(slug: TemplateSlug, priority: "high" | "low" | "auto" = "high"): Promise<HTMLCanvasElement | undefined> {
  const ready = cachedBase.get(slug);
  if (ready) return Promise.resolve(ready);
  const existing = loadedBase.get(slug);
  if (existing) return existing;
  const url = COVER_MANIFEST[slug].maps?.base;
  if (!url) return Promise.resolve(undefined);
  const promise = renderExternalLayer(url, priority).then((canvas) => {
    if (canvas) cachedBase.set(slug, canvas);
    else loadedBase.delete(slug);
    return canvas;
  });
  loadedBase.set(slug, promise);
  return promise;
}

export function loadCoverArt(slug: TemplateSlug, priority: "high" | "low" | "auto" = "auto"): Promise<CoverArt> {
  void loadInsideArt(slug);
  const manifest = COVER_MANIFEST[slug];
  const maps = manifest.maps ?? {};
  if (!Object.keys(maps).length) return Promise.resolve(manifest.procedural(slug));
  const cached = loadedCovers.get(slug);
  if (cached) return cached;

  // Fetch all full-resolution PBR layers in parallel (zero waterfall, deduplicated base.webp).
  const result = Promise.all([
    loadCoverBase(slug, priority === "low" ? "low" : "high"),
    maps.illustration ? renderExternalLayer(maps.illustration, priority) : Promise.resolve(undefined),
    maps.foil ? renderExternalLayer(maps.foil, priority) : Promise.resolve(undefined),
    maps.height ? renderExternalLayer(maps.height, "low") : Promise.resolve(undefined),
  ]).then(([baseMap, reliefMap, foilMap, heightMap]) => {
    const fallback = !baseMap ? manifest.procedural(slug) : placeholderCoverArt(slug);
    const base = baseMap ?? fallback.base;
    const illustration = reliefMap ?? fallback.illustration;
    const foil = foilMap ?? fallback.foil;
    const height = heightMap ?? fallback.height;
    return { base, illustration, foil, height, composite: base };
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
  "sakura-mail": "M -58 -24 H 58 V 42 H -58 Z M -58 -24 L 0 16 L 58 -24 M 0 16 C -10 2 -24 14 0 32 C 24 14 10 2 0 16 Z",
  "teddy-birthday": "M -46 18 C -46 -22 46 -22 46 18 C 46 56 -46 56 -46 18 Z M -36 -16 C -52 -32 -32 -52 -16 -36 M 36 -16 C 52 -32 32 -52 16 -36 M -12 6 H 12",
  "atelier-tea": "M -52 38 Q 0 54 52 38 M -44 -14 H 34 C 34 26 -44 26 -44 -14 Z M 34 -6 C 56 -6 56 18 26 18 M -16 -30 Q -8 -44 -16 -56 M 6 -30 Q 14 -44 6 -56",
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

const insideMottos: Record<TemplateSlug, string> = {
  "candlelight-cake": "A sweet slice for your new year",
  "starry-wish": "All your wishes, safely kept",
  "bloom-garden": "Picked fresh for your special day",
  "confetti-atelier": "Cheers to another wonderful year",
  "sakura-mail": "Blooming softly with love",
  "teddy-birthday": "Warm hugs & sweetest wishes",
  "atelier-tea": "A warm cup for your new year",
};

function leftCornerFiligree(ctx: CanvasRenderingContext2D, x: number, y: number, flipX: number, flipY: number, tint: string | CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX * .74, flipY * .74);
  drawPath(ctx, "M 82 0 C 54 0 45 4 38 20 C 28 42 45 47 53 37 C 58 31 51 25 47 29 M 0 82 C 0 54 4 45 20 38 C 42 28 47 45 37 53 C 31 58 25 51 29 47 M 8 65 C 5 40 17 22 40 15 C 60 9 72 15 80 26 M 65 8 C 40 5 22 17 15 40 C 9 60 15 72 26 80", undefined, tint, 2.2);
  drawPath(ctx, "M 13 23 C 29 7 41 14 34 21 C 29 25 23 21 13 23 M 23 13 C 7 29 14 41 21 34 C 25 29 21 23 23 13", tint);
  for (const [cx, cy] of [[10, 10], [47, 12], [12, 47]]) ellipse(ctx, cx, cy, 2.3, 2.3, tint);
  ctx.restore();
}

function insideArchPath(inset = 0) {
  const left = 132 + inset;
  const right = 636 - inset;
  const top = 192 + inset;
  const base = 716 - inset;
  const r = (right - left) / 2;
  return `M ${left} ${base} L ${left} ${top + r} A ${r} ${r} 0 0 1 ${right} ${top + r} L ${right} ${base} Z`;
}

function dateStamp(ctx: CanvasRenderingContext2D, date: string, color: string) {
  ctx.save();
  ctx.translate(384, 868);
  ctx.rotate(-.035);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  // Vintage double-framed date box
  ctx.strokeRect(-146, -26, 224, 52);
  ctx.lineWidth = 1.1;
  ctx.strokeRect(-140, -20, 212, 40);
  ctx.textBaseline = "middle";
  ctx.font = '22px "Inter", Georgia, serif';
  spacedText(ctx, date.replaceAll("-", " · "), -34, 1, 2.2);
  // Overlapping circular postmark seal + 3 wavy cancellation lines
  ctx.lineWidth = 1.4;
  ellipse(ctx, 94, 0, 31, 31, undefined, color, 1.5);
  ellipse(ctx, 94, 0, 23, 23, undefined, color, 1.0);
  star(ctx, 94, 0, 8, color, 4, .82);
  for (const offsetY of [-10, 0, 10]) {
    drawPath(ctx, `M 127 ${offsetY} Q 139 ${offsetY - 5} 151 ${offsetY} T 175 ${offsetY}`, undefined, color, 1.2);
  }
  ctx.restore();
}

function drawEmblem(ctx: CanvasRenderingContext2D, draft: CardDraft) {
  const metallic = gold(ctx, 64, 960);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Ornate double antique-gold frontispiece frame + 4 botanical filigree corners
  drawPath(ctx, "M 54 56 H 714 V 968 H 54 Z", undefined, metallic, 2.5);
  drawPath(ctx, "M 66 68 H 702 V 956 H 66 Z", undefined, metallic, 1.25);
  for (const [x, y, fx, fy] of [[68, 70, 1, 1], [700, 70, -1, 1], [68, 954, 1, -1], [700, 954, -1, -1]]) {
    leftCornerFiligree(ctx, x, y, fx, fy, metallic);
  }
  // Blind-debossed arched window rim (shadow bevel + highlight bevel for 3D normal lighting)
  drawPath(ctx, insideArchPath(0), undefined, draft.paper === "kraft" ? "#8c654295" : "#bfa88a90", 3.2);
  drawPath(ctx, insideArchPath(3), undefined, "#fffaf0d8", 2.2);
  // Delicate corner micro-stars framing the arch
  for (const [x, y, r] of [[156, 214, 7], [612, 214, 7], [384, 166, 9]]) {
    star(ctx, x, y, r, metallic, 4, .82);
  }
  ctx.restore();
}

export function insideEmblemArt(draft: CardDraft) {
  const { canvas, ctx } = surface();
  drawEmblem(ctx, draft);
  return canvas;
}

function traceInsideArch(ctx: CanvasRenderingContext2D, inset = 0) {
  const left = 132 + inset;
  const right = 636 - inset;
  const top = 192 + inset;
  const base = 716 - inset;
  const r = (right - left) / 2;
  const cx = (left + right) / 2;
  const cy = top + r;
  ctx.beginPath();
  ctx.moveTo(left, base);
  ctx.lineTo(left, cy);
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineTo(right, base);
  ctx.closePath();
}

function insideLeft(ctx: CanvasRenderingContext2D, draft: CardDraft, includeEmblem: boolean) {
  const palette = paperPalette[draft.paper];
  const metallic = gold(ctx, 110, 860);

  // Subtle recessed cotton glow inside the arched window using standard Canvas2D path calls
  // (avoids Path2D clip + multiply blend bugs on Android WeChat / X5 WebView Canvas2D).
  ctx.save();
  traceInsideArch(ctx, 2);
  ctx.fillStyle = draft.paper === "kraft" ? "rgba(252, 232, 200, .42)" : "rgba(255, 253, 247, .64)";
  ctx.fill();

  const vignette = insideImages.get(draft.template) ?? insidePreviews.get(draft.template);
  if (vignette) {
    ctx.clip();
    // Fit the transparent RGBA watercolor vignette comfortably inside the 504x524 arched window
    const drawH = 516;
    const drawW = drawH * (3 / 4);
    ctx.drawImage(vignette, 384 - drawW / 2, 198, drawW, drawH);
  } else {
    // Graceful fallback only if inline preview hasn't decoded yet (~2ms)
    engravedMark(ctx, draft.template, 384, 468, 210, metallic);
  }
  ctx.restore();

  if (includeEmblem) drawEmblem(ctx, draft);

  // Editorial serif header
  ctx.save();
  ctx.fillStyle = draft.paper === "kraft" ? "#6c4830" : "#96794f";
  ctx.font = '24px "Cormorant Garamond", Georgia, serif';
  spacedText(ctx, "WITH LOVE", 384, 134, 7);
  ctx.restore();

  // Theme-specific or custom keepsake motto beneath the arch
  const mottoText = (draft.motto ?? "").trim() || insideMottos[draft.template];
  const hasCjkMotto = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(mottoText);
  ctx.save();
  ctx.fillStyle = draft.paper === "kraft" ? "#63412c" : "#8f6f46";
  ctx.textAlign = "center";
  ctx.font = hasCjkMotto
    ? '28px "Noto Serif SC", "Songti SC", Georgia, serif'
    : 'italic 33px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(mottoText, 384, 782, 560);
  ctx.restore();

  // Vintage wavy birthday postal stamp (shown dynamically when a birthday date is entered)
  if (draft.birthday) {
    dateStamp(ctx, draft.birthday, draft.paper === "kraft" ? "#7e4632" : "#9f6859");
  } else {
    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.globalAlpha = .45;
    star(ctx, 384, 858, 10, metallic, 4, .82);
    ctx.restore();
  }
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
  const inkOption = INK_OPTIONS.find((item) => item.id === draft.ink);
  const paperInk = inkOption ? (draft.paper === "kraft" ? inkOption.kraftColor : inkOption.color) : palette.ink;
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
      const cx = sticker.x * ART_WIDTH;
      const cy = sticker.y * ART_HEIGHT;
      const rad = ((sticker.rotation ?? 0) * Math.PI) / 180;
      ctx.save();
      ctx.translate(cx, cy);
      if (rad) ctx.rotate(rad);
      ctx.drawImage(stickerArt(sticker.type), -size / 2, -size / 2, size, size);
      ctx.restore();
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

/**
 * Renders a high-resolution (1720x1200) keepsake postcard image combining the unfolded
 * Option B left frontispiece and right message page (with stickers) onto a warm linen backdrop.
 */
export function renderKeepsakeCard(draft: CardDraft): HTMLCanvasElement {
  const width = 1720;
  const height = 1200;
  const { canvas, ctx } = surface(width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f8f3ec");
  bg.addColorStop(.5, "#f4ece2");
  bg.addColorStop(1, "#eee4d8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const leftPage = insideArt(draft, "left", false, true);
  const rightPage = insideArt(draft, "right", true, true);
  const pageW = 768;
  const pageH = 1024;
  const spreadW = pageW * 2;
  const startX = Math.round((width - spreadW) / 2);
  const startY = 74;

  // Soft studio drop shadow beneath the open card spread
  ctx.save();
  ctx.shadowColor = "rgba(62, 40, 28, 0.22)";
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = "#efe3d0";
  ctx.fillRect(startX, startY, spreadW, pageH);
  ctx.restore();

  ctx.drawImage(leftPage, startX, startY, pageW, pageH);
  ctx.drawImage(rightPage, startX + pageW, startY, pageW, pageH);

  // Realistic center spine fold shading
  const crease = ctx.createLinearGradient(startX + pageW - 26, 0, startX + pageW + 26, 0);
  crease.addColorStop(0, "rgba(70, 48, 32, 0)");
  crease.addColorStop(.46, "rgba(70, 48, 32, 0.14)");
  crease.addColorStop(.5, "rgba(50, 32, 20, 0.22)");
  crease.addColorStop(.54, "rgba(70, 48, 32, 0.11)");
  crease.addColorStop(1, "rgba(70, 48, 32, 0)");
  ctx.fillStyle = crease;
  ctx.fillRect(startX + pageW - 26, startY, 52, pageH);

  // Subtle stationery footer mark
  ctx.save();
  ctx.fillStyle = "rgba(122, 99, 86, 0.65)";
  ctx.font = '20px "Cormorant Garamond", "Noto Serif SC", Georgia, serif';
  ctx.textAlign = "center";
  ctx.fillText("Birthday Cards · 生日信", width / 2, startY + pageH + 58);
  ctx.restore();

  return canvas;
}

/**
 * Renders a crisp 9:16 mobile vertical keepsake poster (1080x1920) pairing the bespoke
 * illustrated cover on top with the unfolded stationery message & stickers below.
 */
export function renderVerticalKeepsakeCard(draft: CardDraft, coverCanvas?: HTMLCanvasElement): HTMLCanvasElement {
  const width = 1080;
  const height = 1920;
  const { canvas, ctx } = surface(width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#f9f4ed");
  bg.addColorStop(.5, "#f4ece2");
  bg.addColorStop(1, "#ede2d5");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle antique-gold outer poster border
  ctx.save();
  ctx.strokeStyle = "rgba(186, 155, 112, 0.42)";
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, width - 64, height - 64);
  ctx.restore();

  // Top half: bespoke illustrated cover
  const cover = coverCanvas ?? getInitialCoverBase(draft.template);
  const coverW = 612;
  const coverH = Math.round(coverW * 4 / 3); // 816
  const coverX = Math.round((width - coverW) / 2);
  const coverY = 82;
  ctx.save();
  ctx.translate(width / 2, coverY + coverH / 2);
  ctx.rotate(-.014);
  ctx.shadowColor = "rgba(56, 36, 26, 0.24)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#efe3d0";
  ctx.fillRect(-coverW / 2, -coverH / 2, coverW, coverH);
  ctx.shadowColor = "transparent";
  ctx.drawImage(cover, -coverW / 2, -coverH / 2, coverW, coverH);
  ctx.restore();

  // Delicate motto divider between cover and letter
  const mottoText = (draft.motto ?? "").trim() || insideMottos[draft.template];
  const hasCjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(mottoText);
  ctx.save();
  ctx.fillStyle = "#8a6d49";
  ctx.textAlign = "center";
  ctx.font = hasCjk
    ? '26px "Noto Serif SC", "Songti SC", Georgia, serif'
    : 'italic 30px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(mottoText, width / 2, coverY + coverH + 56, width - 160);
  ctx.restore();

  // Bottom half: crisp message stationery page with stickers
  const rightPage = insideArt(draft, "right", true, true);
  const pageW = 612;
  const pageH = Math.round(pageW * 4 / 3); // 816
  const pageX = Math.round((width - pageW) / 2);
  const pageY = coverY + coverH + 92;
  ctx.save();
  ctx.shadowColor = "rgba(56, 36, 26, 0.2)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#f4e8d6";
  ctx.fillRect(pageX, pageY, pageW, pageH);
  ctx.shadowColor = "transparent";
  ctx.drawImage(rightPage, pageX, pageY, pageW, pageH);
  ctx.restore();

  // Footer caption
  ctx.save();
  ctx.fillStyle = "rgba(122, 99, 86, 0.7)";
  ctx.font = '21px "Cormorant Garamond", "Noto Serif SC", Georgia, serif';
  ctx.textAlign = "center";
  const footerText = draft.birthday
    ? `Birthday Cards · ${draft.birthday.replaceAll("-", ".")}`
    : "Birthday Cards · 生日信";
  ctx.fillText(footerText, width / 2, height - 56);
  ctx.restore();

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
