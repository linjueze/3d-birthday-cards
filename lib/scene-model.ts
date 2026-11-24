import * as THREE from "three";
import {
  COVER_MANIFEST, coverArt, getInitialCoverBase, insideArt, insideEmblemArt, isFullCoverBaseCached,
  linerArt, loadCoverArt, loadCoverBase, loadCoverPreview, loadInsideArt, loadInsidePreview, paperMaps,
  placeholderCoverArt, STICKER_BASE_SIZE, stickerArt,
} from "./art";
import { TEMPLATES, type CardDraft, type PaperId, type TemplateSlug } from "./cards";
import { createCoverLivingFX, createFoilSheen } from "./scene-fx";

export const CARD_WIDTH = 3.12;
export const CARD_HEIGHT = 4.16;
export const ENVELOPE_WIDTH = 4.70;
export const ENVELOPE_HEIGHT = 3.02;

const CARD_DEPTH = .046;
const HALF_CARD = CARD_WIDTH / 2;
const COVER_CENTER = CARD_DEPTH + .015;

export function imageTexture(canvas: HTMLCanvasElement, color = true, anisotropy = 8) {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/**
 * Replaces a material's map with a fresh CanvasTexture and disposes the old one.
 * Required in WebGL2 (Three.js r180+) whenever canvas dimensions change (e.g. 240x320
 * inline preview -> 900x1200 WebP), because texStorage2D allocates immutable texture sizes.
 */
function replaceMap(material: THREE.MeshPhysicalMaterial, canvas: HTMLCanvasElement) {
  const previous = material.map;
  if (previous && previous.image === canvas) return;
  material.map = imageTexture(canvas);
  material.needsUpdate = true;
  previous?.dispose();
}

function studioMaterial(options: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial({
    roughness: .87,
    metalness: 0,
    ...options,
  });
}

function heightNormal(source: HTMLCanvasElement, strength: number, channel = 0) {
  const size = document.createElement("canvas");
  size.width = 384;
  size.height = 512;
  const context = size.getContext("2d")!;
  context.drawImage(source, 0, 0, size.width, size.height);
  const original = context.getImageData(0, 0, size.width, size.height).data;
  const output = context.createImageData(size.width, size.height);
  for (let row = 0; row < size.height; row++) {
    const top = Math.max(0, row - 1);
    const bottom = Math.min(size.height - 1, row + 1);
    for (let column = 0; column < size.width; column++) {
      const left = Math.max(0, column - 1);
      const right = Math.min(size.width - 1, column + 1);
      const horizontal = (original[(row * size.width + right) * 4 + channel] - original[(row * size.width + left) * 4 + channel]) * strength / 255;
      const vertical = (original[(bottom * size.width + column) * 4 + channel] - original[(top * size.width + column) * 4 + channel]) * strength / 255;
      const normalLength = Math.hypot(horizontal, vertical, 1);
      const index = (row * size.width + column) * 4;
      output.data[index] = 128 - horizontal / normalLength * 127;
      output.data[index + 1] = 128 + vertical / normalLength * 127;
      output.data[index + 2] = 128 + 127 / normalLength;
      output.data[index + 3] = 255;
    }
  }
  context.putImageData(output, 0, 0);
  return imageTexture(size, false);
}

export function buildPaperMaps() {
  const cache = new Map<PaperId, { normal: THREE.CanvasTexture; roughness: THREE.CanvasTexture }>();
  return {
    get(id: PaperId) {
      let entry = cache.get(id);
      if (!entry) {
        const maps = paperMaps(id);
        entry = { normal: imageTexture(maps.normal, false), roughness: imageTexture(maps.roughness, false) };
        cache.set(id, entry);
      }
      return entry;
    },
    values() {
      return cache.values();
    },
  };
}

export type ScenePaperMaps = ReturnType<typeof buildPaperMaps>;

function cardPlane(material: THREE.Material, x: number, z: number, back = false) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), material);
  mesh.position.set(x, 0, z);
  if (back) mesh.rotation.y = Math.PI;
  return mesh;
}

export function buildBook(
  slug: TemplateSlug,
  draft: CardDraft,
  allMaps: ScenePaperMaps,
  onMaterialChange: () => void,
  isPriority = true,
) {
  const template = TEMPLATES.find((item) => item.slug === slug)!;
  const hasExternalMaps = Object.keys(COVER_MANIFEST[slug].maps ?? {}).length > 0;
  const artwork = hasExternalMaps ? placeholderCoverArt(slug) : coverArt(slug);
  const root = new THREE.Group();
  const hinge = new THREE.Group();
  hinge.position.set(-HALF_CARD, 0, COVER_CENTER);
  root.add(hinge);

  const edge = studioMaterial({ color: new THREE.Color(template.color).lerp(new THREE.Color("#c9ae88"), .34) });
  const edgeMaterial = [edge, edge, edge, edge, edge, edge];
  const backBoard = new THREE.Mesh(new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH), edgeMaterial);
  const coverBoard = new THREE.Mesh(new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH), edgeMaterial);
  coverBoard.position.x = HALF_CARD;
  root.add(backBoard);
  hinge.add(coverBoard);

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.037, .037, CARD_HEIGHT, 8), edge);
  spine.position.set(-HALF_CARD + .017, 0, COVER_CENTER / 2);
  root.add(spine);

  // Frame 0: Paint the inline 240x320 NEW illustrated cover (or cached full-res base.webp) immediately —
  // never shows the legacy procedural cover and never shows a blank card while full-res WebPs download.
  const initialBase = hasExternalMaps ? getInitialCoverBase(slug) : artwork.base;
  const exterior = studioMaterial({ map: imageTexture(initialBase), roughness: .81 });
  let reliefNormal: THREE.CanvasTexture | null = hasExternalMaps ? null : heightNormal(artwork.height, .67);
  const relief = studioMaterial({
    map: imageTexture(artwork.illustration), normalMap: reliefNormal, normalScale: new THREE.Vector2(.52, .52),
    transparent: true, depthWrite: false, alphaTest: .025, clearcoat: .21, clearcoatRoughness: .57, roughness: .73,
  });
  const foil = studioMaterial({
    map: imageTexture(artwork.foil), normalMap: reliefNormal, normalScale: new THREE.Vector2(.54, .54),
    transparent: true, depthWrite: false, alphaTest: .035, clearcoat: .72, clearcoatRoughness: .2,
    roughness: .32, metalness: .48, emissive: new THREE.Color("#8a6226"), emissiveIntensity: .08,
  });
  const isDarkCover = slug === "starry-wish" || slug === "confetti-atelier";
  const foilSheen = createFoilSheen(CARD_WIDTH, CARD_HEIGHT, foil.map!, isDarkCover);
  foilSheen.mesh.position.set(HALF_CARD, 0, CARD_DEPTH / 2 + .0145);
  const livingFX = createCoverLivingFX(slug);
  livingFX.group.position.set(HALF_CARD, 0, CARD_DEPTH / 2 + .017);

  let active = true;
  let fullBaseApplied = !hasExternalMaps || isFullCoverBaseCached(slug);
  if (hasExternalMaps) {
    const priority = isPriority ? "high" : "low";
    // If the inline 240x320 preview was still decoding during the very first 2ms, swap it in immediately.
    if (!fullBaseApplied) {
      void loadCoverPreview(slug).then((previewCanvas) => {
        if (!active || fullBaseApplied || !previewCanvas) return;
        replaceMap(exterior, previewCanvas);
        onMaterialChange();
      }).catch(() => undefined);
    }
    // Kick off base.webp AND all PBR layers in parallel (zero waterfall!):
    // - full-res base.webp sharpens exterior the millisecond it finishes (without waiting for foil/relief)
    // - relief, foil, and height normal layer seamlessly right behind it.
    void loadCoverBase(slug, priority).then((baseCanvas) => {
      if (!active || !baseCanvas) return;
      fullBaseApplied = true;
      replaceMap(exterior, baseCanvas);
      onMaterialChange();
    }).catch(() => undefined);
    void loadCoverArt(slug, priority).then((replacement) => {
      if (!active) return;
      fullBaseApplied = true;
      replaceMap(exterior, replacement.base);
      replaceMap(relief, replacement.illustration);
      replaceMap(foil, replacement.foil);
      foilSheen.setMap(foil.map!);
      if (replacement.height !== artwork.height) {
        reliefNormal?.dispose();
        reliefNormal = heightNormal(replacement.height, .72);
        relief.normalMap = foil.normalMap = reliefNormal;
        relief.needsUpdate = foil.needsUpdate = true;
      }
      onMaterialChange();
    }).catch(() => undefined);
  }
  const panel = cardPlane(exterior, HALF_CARD, CARD_DEPTH / 2 + .001);
  const illustration = cardPlane(relief, HALF_CARD, CARD_DEPTH / 2 + .008);
  const gilding = cardPlane(foil, HALF_CARD, CARD_DEPTH / 2 + .012);
  illustration.renderOrder = 2;
  gilding.renderOrder = 3;
  hinge.add(panel, illustration, gilding, foilSheen.mesh, livingFX.group);
  const backing = studioMaterial({ color: template.color, roughness: .8 });
  root.add(cardPlane(backing, 0, -CARD_DEPTH / 2 - .001, true));

  const themedDraft = { ...draft, template: slug };
  const leftMaterial = studioMaterial({ map: imageTexture(insideArt(themedDraft, "left", false, false)) });
  const rightMaterial = studioMaterial({ map: imageTexture(insideArt(themedDraft, "right", false)) });
  const baseEmblem = insideEmblemArt(themedDraft);
  const emblemMaterial = studioMaterial({
    map: imageTexture(baseEmblem), normalMap: heightNormal(baseEmblem, .7, 3), normalScale: new THREE.Vector2(.33, .33),
    transparent: true, alphaTest: .025, depthWrite: false, roughness: .71, clearcoat: .19,
  });
  const leftInner = cardPlane(leftMaterial, HALF_CARD, -CARD_DEPTH / 2 - .002, true);
  const leftEmblem = cardPlane(emblemMaterial, HALF_CARD, -CARD_DEPTH / 2 - .011, true);
  leftEmblem.renderOrder = 2;
  const rightInner = cardPlane(rightMaterial, 0, CARD_DEPTH / 2 + .002);
  hinge.add(leftInner, leftEmblem);
  root.add(rightInner);

  const stickerGroup = new THREE.Group();
  root.add(stickerGroup);
  const selection = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: selectionTexture(), transparent: true, opacity: .92, depthWrite: false,
    }),
  );
  selection.renderOrder = 6;
  selection.position.z = CARD_DEPTH / 2 + .031;
  selection.visible = false;
  stickerGroup.add(selection);
  const stickers = new Map<string, { type: CardDraft["stickers"][number]["type"]; mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial> }>();

  function updateStickers(updated: CardDraft["stickers"], selected: string | null | undefined) {
    for (const [id, entry] of stickers) {
      if (updated.some((item) => item.id === id && item.type === entry.type)) continue;
      entry.mesh.removeFromParent();
      entry.mesh.geometry.dispose();
      entry.mesh.material.map?.dispose();
      entry.mesh.material.dispose();
      stickers.delete(id);
    }

    selection.visible = false;
    const geometrySize = STICKER_BASE_SIZE * CARD_WIDTH;
    updated.forEach((sticker, index) => {
      let entry = stickers.get(sticker.id);
      if (!entry) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(geometrySize, geometrySize),
          studioMaterial({ map: imageTexture(stickerArt(sticker.type)), transparent: true, depthWrite: false, alphaTest: .035, roughness: .72 }),
        );
        entry = { type: sticker.type, mesh };
        stickerGroup.add(mesh);
        stickers.set(sticker.id, entry);
      }
      const x = (sticker.x - .5) * CARD_WIDTH;
      const y = (.5 - sticker.y) * CARD_HEIGHT;
      entry.mesh.position.set(x, y, CARD_DEPTH / 2 + .009 + index * .0005);
      entry.mesh.scale.setScalar(sticker.scale);
      entry.mesh.renderOrder = 4 + index * .01;
      if (sticker.id === selected) {
        selection.visible = true;
        selection.position.x = x;
        selection.position.y = y;
        selection.scale.setScalar(geometrySize * sticker.scale * 1.15);
      }
    });
  }

  let paper: PaperId;
  let latestDraft: CardDraft = themedDraft;
  let leftKey = JSON.stringify([themedDraft.paper, themedDraft.birthday]);
  let rightKey = JSON.stringify([themedDraft.paper, themedDraft.recipient, themedDraft.message, themedDraft.sender, themedDraft.font]);
  let stickersKey = "";

  let fullInsideApplied = false;
  void loadInsidePreview(slug).then((previewImg) => {
    if (!active || fullInsideApplied || !previewImg) return;
    replaceMap(leftMaterial, insideArt({ ...latestDraft, template: slug }, "left", false, false));
    onMaterialChange();
  }).catch(() => undefined);

  void loadInsideArt(slug).then((img) => {
    if (!active || !img) return;
    fullInsideApplied = true;
    replaceMap(leftMaterial, insideArt({ ...latestDraft, template: slug }, "left", false, false));
    onMaterialChange();
  }).catch(() => undefined);

  function update(next: CardDraft, selected?: string | null) {
    latestDraft = { ...next, template: slug };
    if (paper !== next.paper) {
      if (paper !== undefined) {
        const emblem = insideEmblemArt(latestDraft);
        emblemMaterial.map!.image = emblem;
        emblemMaterial.map!.needsUpdate = true;
        emblemMaterial.normalMap!.dispose();
        emblemMaterial.normalMap = heightNormal(emblem, .7, 3);
      }
      paper = next.paper;
      const maps = allMaps.get(paper)!;
      for (const material of [exterior, backing, leftMaterial, rightMaterial]) {
        material.normalMap = maps.normal;
        material.roughnessMap = maps.roughness;
        const scale = paper === "watercolor" ? .35 : .22;
        material.normalScale.set(scale, scale);
        material.roughness = paper === "pearl" ? .60 : .94;
        material.clearcoat = paper === "pearl" ? .31 : .02;
        material.needsUpdate = true;
      }
      exterior.color.set(paper === "kraft" ? "#f3dfc6" : "#ffffff");
      backing.color.set(template.color).multiply(new THREE.Color(paper === "kraft" ? "#ecd6b6" : "#ffffff"));
    }
    const nextLeftKey = JSON.stringify([latestDraft.paper, latestDraft.birthday]);
    if (nextLeftKey !== leftKey) {
      leftKey = nextLeftKey;
      replaceMap(leftMaterial, insideArt(latestDraft, "left", false, false));
    }
    const nextRightKey = JSON.stringify([latestDraft.paper, latestDraft.recipient, latestDraft.message, latestDraft.sender, latestDraft.font]);
    if (nextRightKey !== rightKey) {
      rightKey = nextRightKey;
      rightMaterial.map!.image = insideArt(latestDraft, "right", false);
      rightMaterial.map!.needsUpdate = true;
    }
    const nextStickersKey = JSON.stringify([latestDraft.stickers, selected]);
    if (nextStickersKey !== stickersKey) {
      stickersKey = nextStickersKey;
      updateStickers(latestDraft.stickers, selected);
    }
  }

  function refreshText(next: CardDraft) {
    // Face fonts can finish loading after the initial paint.
    leftKey = "";
    rightKey = "";
    update(next);
  }

  function animate(elapsed: number, yaw: number, pitch: number, openFraction: number, reduced: boolean) {
    foilSheen.update(elapsed, yaw, pitch, openFraction, reduced);
    livingFX.update(elapsed, openFraction, reduced);
  }

  update(themedDraft);
  return { slug, root, hinge, stickerGroup, rightInner, targets: [panel, leftInner, rightInner, backBoard], update, refreshText, animate, deactivate: () => { active = false; } };
}

function selectionTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  context.strokeStyle = "#a58045";
  context.lineWidth = 2;
  context.setLineDash([7, 5]);
  context.strokeRect(5, 5, 118, 118);
  context.fillStyle = "#fffaf0";
  context.setLineDash([]);
  for (const x of [5, 123]) {
    for (const y of [5, 123]) {
      context.fillRect(x - 3, y - 3, 6, 6);
      context.strokeRect(x - 3, y - 3, 6, 6);
    }
  }
  return imageTexture(canvas);
}

export function createShadow(opacity = .23) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, "rgba(65,43,29,.78)");
  gradient.addColorStop(.34, "rgba(65,43,29,.55)");
  gradient.addColorStop(.65, "rgba(65,43,29,.16)");
  gradient.addColorStop(1, "rgba(65,43,29,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: imageTexture(canvas), transparent: true, opacity, depthWrite: false,
    }),
  );
}

function envelopeShape(points: [number, number][]) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return shape;
}

function matchingUVs(geometry: THREE.BufferGeometry, width: number, height: number, offsetY = 0) {
  const positions = geometry.getAttribute("position");
  const uv = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index++) {
    uv[index * 2] = positions.getX(index) / width + .5;
    uv[index * 2 + 1] = (positions.getY(index) + offsetY) / height + .5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function seam(points: THREE.Vector3[], color: string, size: number) {
  const path = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(
    new THREE.TubeGeometry(path, 24, size, 4, false),
    studioMaterial({ color, roughness: .72 }),
  );
}

function waxDiskHalf(side: 1 | -1) {
  const radius = .41;
  const outline: [number, number][] = [];
  for (let step = 0; step <= 28; step++) {
    const angle = Math.PI / 2 - side * (Math.PI * step / 28);
    const localRadius = radius * (1 + .068 * Math.sin(angle * 7 + .2) + .025 * Math.cos(angle * 13));
    outline.push([localRadius * Math.cos(angle), localRadius * Math.sin(angle)]);
  }
  outline.push([-.07, -.26], [.015, -.16], [-.010, -.066], [.066, .034], [-.056, .14], [.007, .25]);
  return envelopeShape(outline);
}

function waxMark(side: 1 | -1, material: THREE.Material) {
  const ring = new THREE.Group();
  for (const radius of [.281, .237]) {
    const geometry = new THREE.TorusGeometry(radius, radius > .26 ? .012 : .006, 7, 46, Math.PI);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    ring.add(mesh);
  }
  const halfStar = envelopeShape([
    [0, .171], [side * .047, .044], [side * .163, 0], [side * .047, -.044], [0, -.171],
  ]);
  const geometry = new THREE.ExtrudeGeometry(halfStar, { depth: .008, bevelEnabled: true, bevelSize: .007, bevelThickness: .003, bevelSegments: 2 });
  ring.add(new THREE.Mesh(geometry, material));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.018, 9, 6), material);
  dot.position.set(side * .11, .12 * side, 0);
  dot.scale.z = .4;
  ring.add(dot);
  ring.position.z = .093;
  return ring;
}

function flapGeometry(width: number, height: number) {
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = 18;
  const rows = 18;
  for (let row = 0; row <= rows; row++) {
    const position = row / rows;
    const halfWidth = Math.max(.016, width / 2 * Math.pow(1 - position, .92));
    for (let column = 0; column <= segments; column++) {
      vertices.push((column / segments * 2 - 1) * halfWidth, -height * position, 0);
      if (row === rows || column === segments) continue;
      const first = row * (segments + 1) + column;
      const below = first + segments + 1;
      indices.push(first, below, first + 1, first + 1, below, below + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return matchingUVs(geometry, width, height * 1.4, height / 2);
}

export function buildEnvelope(paper: ScenePaperMaps) {
  const root = new THREE.Group();
  const halfW = ENVELOPE_WIDTH / 2;
  const halfH = ENVELOPE_HEIGHT / 2;
  const face = studioMaterial({
    color: "#fff1da", normalMap: paper.get("watercolor")!.normal, roughnessMap: paper.get("watercolor")!.roughness,
    normalScale: new THREE.Vector2(.23, .23), roughness: .94,
  });
  const shade = face.clone();
  shade.color.set("#ebd7b9");
  const base = face.clone();
  base.color.set("#f3e0c4");
  const liner = studioMaterial({ map: imageTexture(linerArt()), roughness: .76, clearcoat: .12 });
  const linerReverse = liner.clone();
  linerReverse.side = THREE.BackSide;
  const box = new THREE.Mesh(new THREE.BoxGeometry(ENVELOPE_WIDTH, ENVELOPE_HEIGHT, .07), face);
  root.add(box);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(ENVELOPE_WIDTH - .115, ENVELOPE_HEIGHT - .115), liner);
  pad.position.z = .038;
  root.add(pad);

  const bottomPanel = new THREE.Mesh(matchingUVs(new THREE.ShapeGeometry(envelopeShape([
    [-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [0, -.37], [-halfW, halfH],
  ])), ENVELOPE_WIDTH, ENVELOPE_HEIGHT), base);
  bottomPanel.position.z = .46;
  root.add(bottomPanel);
  const sidePanels = [
    [[-halfW, -halfH], [-halfW, halfH], [.32, -.39], [-.97, -1.10]],
    [[halfW, halfH], [halfW, -halfH], [.97, -1.10], [-.32, -.39]],
  ] as [number, number][][];
  for (const points of sidePanels) {
    const side = new THREE.Mesh(matchingUVs(new THREE.ShapeGeometry(envelopeShape(points)), ENVELOPE_WIDTH, ENVELOPE_HEIGHT), shade);
    side.position.z = .475;
    root.add(side);
  }
  // The overlapping lower pocket hides the side-panel cuts and occludes the inserted card cleanly.
  const lowerFace = new THREE.Mesh(matchingUVs(new THREE.ShapeGeometry(envelopeShape([
    [-halfW, -halfH], [halfW, -halfH], [halfW - .18, -1.27], [0, -.26], [-halfW + .18, -1.27],
  ])), ENVELOPE_WIDTH, ENVELOPE_HEIGHT), face);
  lowerFace.position.z = .49;
  root.add(lowerFace);
  root.add(seam([
    new THREE.Vector3(-halfW + .025, -halfH + .02, .50),
    new THREE.Vector3(-1.24, -.84, .50),
    new THREE.Vector3(0, -.29, .50),
    new THREE.Vector3(1.24, -.84, .50),
    new THREE.Vector3(halfW - .025, -halfH + .02, .50),
  ], "#d4bb96", .009));

  const flapHeight = halfH + .24;
  const flap = new THREE.Group();
  flap.position.set(0, halfH, .504);
  const geometry = flapGeometry(ENVELOPE_WIDTH, flapHeight);
  flap.add(new THREE.Mesh(geometry, face), new THREE.Mesh(geometry, linerReverse));
  const waxSpot = new THREE.Group();
  waxSpot.position.set(0, -flapHeight + .01, .035);
  flap.add(waxSpot);
  const waxMaterial = studioMaterial({ color: "#9f354d", roughness: .25, clearcoat: .86, clearcoatRoughness: .15, metalness: .09 });
  const stampMaterial = studioMaterial({ color: "#c2677e", emissive: "#5e1629", emissiveIntensity: .08, roughness: .38, clearcoat: .60 });
  const crackedWax = waxMaterial.clone();
  const crackedStamp = stampMaterial.clone();
  crackedWax.transparent = crackedStamp.transparent = true;
  const fragments = ([-1, 1] as const).map((side) => {
    const fragment = new THREE.Group();
    const shape = new THREE.ExtrudeGeometry(waxDiskHalf(side), {
      depth: .063, bevelSegments: 3, bevelSize: .032, bevelThickness: .023, steps: 1,
    });
    fragment.add(new THREE.Mesh(shape, crackedWax), waxMark(side, crackedStamp));
    waxSpot.add(fragment);
    return fragment;
  });
  const molten = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), waxMaterial);
  waxSpot.add(molten);
  root.add(flap);

  let lastBend = Number.NEGATIVE_INFINITY;

  function update(flapAngle: number, waxProgress: number, sealed: number, fracture: number) {
    flap.rotation.x = flapAngle;
    // Keep the open flap seated cleanly behind the pocket plane so the card never clips it.
    flap.position.z = THREE.MathUtils.lerp(.504, .012, THREE.MathUtils.smoothstep(flapAngle, 0, 1.15));
    const bend = Math.sin(flapAngle) * .18;
    if (Math.abs(bend - lastBend) > .001) {
      const position = geometry.getAttribute("position");
      for (let index = 0; index < position.count; index++) {
        const fraction = -position.getY(index) / flapHeight;
        position.setZ(index, Math.sin(Math.PI * fraction) * bend);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      lastBend = bend;
    }
    molten.visible = waxProgress > 0 && sealed === 0;
    const waxRadius = .095 + .305 * waxProgress;
    molten.scale.set(waxRadius * (1 + waxProgress * .13), waxRadius, .025 + .065 * waxProgress);
    molten.position.z = -.006 + .073 * waxProgress;
    crackedWax.opacity = crackedStamp.opacity = 1 - THREE.MathUtils.smoothstep(fracture, .50, 1);
    fragments.forEach((fragment, index) => {
      const direction = index === 0 ? -1 : 1;
      fragment.visible = sealed > 0 && fracture < 1;
      const bounce = (1 - sealed) * Math.sin(sealed * Math.PI * 2.8);
      const scale = (.82 + .18 * sealed + bounce * .22) * (1 - fracture * .19);
      fragment.scale.setScalar(scale);
      fragment.position.set(direction * fracture * .75, -fracture * fracture * (index ? .74 : .56), fracture * .42);
      fragment.rotation.set(fracture * direction * .43, -fracture * direction * .54, direction * fracture * 1.38);
    });
  }

  update(0, 0, 0, 0);
  return { root, waxSpot, update };
}

export function disposeScene(root: THREE.Object3D, paper: ScenePaperMaps) {
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    resources.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) resources.add(value);
      }
    }
  });
  for (const { normal, roughness } of paper.values()) {
    resources.add(normal);
    resources.add(roughness);
  }
  for (const resource of resources) resource.dispose();
}
