import * as THREE from "three";
import { TEMPLATES, type CardDraft, type TemplateSlug } from "./cards";
import {
  buildBook, buildEnvelope, buildPaperMaps, CARD_WIDTH, createShadow, disposeScene, ENVELOPE_WIDTH,
} from "./scene-model";
import { STICKER_BASE_SIZE } from "./art";

export type SceneProps = {
  draft: CardDraft;
  mode: "gallery" | "editor" | "pack" | "letter";
  open?: boolean;
  onToggle?: () => void;
  onTemplateSelect?: (slug: TemplateSlug) => void;
  envelope?: "none" | "packing" | "unsealed" | "sealed" | "breaking" | "opened";
  sealProgress?: number;
  onReady?: () => void;
  onStickerSelect?: (id: string) => void;
  onStickerMove?: (id: string, x: number, y: number) => void;
  onStickerCommit?: () => void;
  selectedSticker?: string | null;
  className?: string;
};

export const FALLBACK_TIMINGS = { packing: 2500, breaking: 2220 } as const;

type Book = ReturnType<typeof buildBook>;
type Slot = { x: number; z: number; y: number; pitch: number; yaw: number; roll: number; scale: number };

export const GALLERY_SLOTS: readonly Slot[] = [
  { x: .04, z: .24, y: .04, pitch: .057, yaw: -.078, roll: -.025, scale: 1 },
  { x: -1.65, z: -.67, y: .055, pitch: .052, yaw: .31, roll: .164, scale: .83 },
  { x: 1.72, z: -.52, y: -.065, pitch: .063, yaw: -.39, roll: -.19, scale: .84 },
  { x: -2.71, z: -1.39, y: -.155, pitch: .085, yaw: .54, roll: .303, scale: .724 },
];

export function galleryOffset(slug: TemplateSlug, selected: TemplateSlug) {
  const active = TEMPLATES.findIndex((item) => item.slug === selected);
  const current = TEMPLATES.findIndex((item) => item.slug === slug);
  return (current - active + TEMPLATES.length) % TEMPLATES.length;
}

function unit(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function ease(value: number) {
  const t = unit(value);
  return t * t * (3 - 2 * t);
}

function span(value: number, start: number, end: number) {
  return ease((value - start) / (end - start));
}

function lights(scene: THREE.Scene) {
  const ambient = new THREE.HemisphereLight("#fffdf8", "#b19583", 1.25);
  const key = new THREE.DirectionalLight("#fff5e7", 1.7);
  key.position.set(-3.9, 5.85, 5);
  const fill = new THREE.DirectionalLight("#fffdef", .69);
  fill.position.set(3.7, -.4, 5);
  const rim = new THREE.DirectionalLight("#ffffff", .22);
  rim.position.set(2.8, 3.8, -3);
  scene.add(ambient, key, fill, rim);
}

function resolution(aspect: number) {
  // Preserve enough negative space around the main object on narrow stages.
  return Math.max(5.63, 4.05 / aspect);
}

export type SceneHit = { slug?: TemplateSlug; sticker?: string; x?: number; y?: number };

export function createStage(
  host: HTMLDivElement,
  read: () => SceneProps,
  available: (available: boolean) => void,
) {
  const canvas = document.createElement("canvas");
  const options = { alpha: true, antialias: true, powerPreference: "high-performance" as const };
  const context = canvas.getContext("webgl2", options) as WebGL2RenderingContext | null;
  if (!context) {
    available(false);
    return;
  }
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, ...options });
  } catch {
    available(false);
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;pointer-events:none";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .1, 40);
  camera.position.z = 14;
  const allMaps = buildPaperMaps();
  const books = new Map<TemplateSlug, { book: Book; shadow: ReturnType<typeof createShadow>; contact: ReturnType<typeof createShadow> }>();
  const envelope = buildEnvelope(allMaps);
  const envShadow = createShadow(.27);
  envShadow.renderOrder = -2;
  envShadow.position.z = -2.25;
  scene.add(envelope.root, envShadow);
  lights(scene);

  let width = 0;
  let height = 0;
  let cameraSize = 0;
  let open = read().open ? 1 : 0;
  let previousTime = 0;
  let elapsed = 0;
  let frame = 0;
  let initial = true;
  let inViewport = true;
  let renderUntil = 0;
  let lastProps: SceneProps | undefined;
  let activeSlug = read().draft.template;
  let activeEnvelope: SceneProps["envelope"];
  let animationTime = 0;
  let completed = false;
  let lost = false;
  let activeDraft: CardDraft | null = null;
  let activeSticker: string | null | undefined;
  let requestedPitch = 0;
  let requestedYaw = 0;
  let pitch = 0;
  let yaw = 0;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const damp = THREE.MathUtils.damp;
  const mix = THREE.MathUtils.lerp;

  function wake(duration = 690) {
    renderUntil = Math.max(renderUntil, performance.now() + duration);
  }

  function createBook(slug: TemplateSlug, draft: CardDraft) {
    let entry = books.get(slug);
    if (!entry) {
      const book = buildBook(slug, draft, allMaps, wake);
      const shadow = createShadow(.38);
      const contact = createShadow(.23);
      shadow.position.z = -2.09;
      contact.position.z = -2.09;
      shadow.renderOrder = contact.renderOrder = -3;
      entry = { book, shadow, contact };
      books.set(slug, entry);
      scene.add(book.root, shadow, contact);
      if (read().mode === "gallery") {
        const slot = GALLERY_SLOTS[galleryOffset(slug, read().draft.template)];
        book.root.position.set(slot.x, slot.y, slot.z);
        book.root.scale.setScalar(slot.scale);
        book.root.rotation.set(slot.pitch, slot.yaw, slot.roll);
      }
    }
    return entry;
  }

  function updateProjection(aspect: number, nextSize: number) {
    camera.top = nextSize / 2;
    camera.bottom = -nextSize / 2;
    camera.left = -nextSize * aspect / 2;
    camera.right = nextSize * aspect / 2;
    camera.updateProjectionMatrix();
  }

  function updateSize() {
    const rect = host.getBoundingClientRect();
    width = Math.floor(rect.width);
    height = Math.floor(rect.height);
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    if (!cameraSize) cameraSize = resolution(width / height);
    updateProjection(width / height, cameraSize);
    wake();
  }

  const observer = new ResizeObserver(updateSize);
  observer.observe(host);
  updateSize();
  const intersection = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (inViewport) wake();
  });
  intersection.observe(host);
  const resume = () => {
    if (!document.hidden) wake();
  };
  document.addEventListener("visibilitychange", resume);
  reduced.addEventListener("change", resume);

  function handleContextLoss(event: Event) {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    available(false);
  }

  renderer.domElement.addEventListener("webglcontextlost", handleContextLoss);
  const refreshFonts = () => {
    const { draft, selectedSticker } = read();
    const entry = books.get(draft.template);
    entry?.book.refreshText(draft);
    entry?.book.update(draft, selectedSticker);
    wake();
  };
  document.fonts?.addEventListener("loadingdone", refreshFonts);

  function updateBookPose(book: Book, x: number, y: number, z: number, rx: number, ry: number, rz: number, scale: number, fraction: number, dt: number, direct = false) {
    const root = book.root;
    if (direct) {
      root.position.set(x, y, z);
      root.rotation.set(rx, ry, rz);
      root.scale.setScalar(scale);
    } else {
      root.position.x = damp(root.position.x, x, 10, dt);
      root.position.y = damp(root.position.y, y, 10, dt);
      root.position.z = damp(root.position.z, z, 10, dt);
      root.rotation.x = damp(root.rotation.x, rx, 10, dt);
      root.rotation.y = damp(root.rotation.y, ry, 10, dt);
      root.rotation.z = damp(root.rotation.z, rz, 10, dt);
      root.scale.setScalar(damp(root.scale.x, scale, 12, dt));
    }
    book.hinge.rotation.y = -fraction * (Math.PI - .068);
    book.stickerGroup.visible = fraction > .36;
  }

  function updateBookShadow(entry: ReturnType<typeof createBook>, opacity: number, offset = 0) {
    const { book, shadow, contact } = entry;
    const { x, y } = book.root.position;
    const scale = book.root.scale.x;
    shadow.position.x = x + .14 - offset * .7;
    shadow.position.y = y - 2.17 * scale;
    shadow.scale.set((4.25 + offset) * scale, .72, 1);
    shadow.material.opacity = opacity * .88;
    contact.position.x = x + .27 - offset / 2;
    contact.position.y = y - .09;
    contact.scale.set((3.96 + offset * 1.7) * scale, 4.34 * scale, 1);
    contact.material.opacity = opacity * .35;
  }

  function render(now: number) {
    if (lost) return;
    frame = requestAnimationFrame(render);
    const props = read();
    const envelopePhase = props.envelope ?? "none";
    const reducedMotion = reduced.matches;
    if (props !== lastProps) {
      lastProps = props;
      wake();
    }
    const timing = (envelopePhase === "packing" || envelopePhase === "breaking") && (activeEnvelope !== envelopePhase || !completed);
    const visible = inViewport && !document.hidden && width > 0 && height > 0;
    if (!visible && !timing) return;
    const idleInterval = reducedMotion ? Number.POSITIVE_INFINITY : width < 500 ? 100 : 80;
    if (!initial && !timing && now > renderUntil && now - previousTime < idleInterval) return;
    const dt = initial ? .05 : Math.min(.11, (now - previousTime) / 1000);
    previousTime = now;

    const { draft, mode, selectedSticker } = props;
    const gallery = mode === "gallery";
    const mobile = width < 500 || width / height < 1.17;
    elapsed += dt;
    if (activeSlug !== draft.template) {
      activeSlug = draft.template;
      requestedPitch = 0;
      requestedYaw = 0;
    }

    if (activeEnvelope !== envelopePhase) {
      activeEnvelope = envelopePhase;
      animationTime = now;
      completed = false;
      if (envelopePhase === "sealed" || envelopePhase === "packing") {
        requestedPitch = 0;
        requestedYaw = 0;
      }
    }

    const wallTime = now - animationTime;
    const time = reducedMotion && wallTime >= 125 ? 3 : wallTime / 1000;
    const showEnvelope = envelopePhase !== "none" && envelopePhase !== "opened";
    const packaging = envelopePhase === "packing";
    const breaking = envelopePhase === "breaking";
    const displayBook = !showEnvelope || packaging && time < 2.02 || breaking && time > .59;
    open = reducedMotion ? Number(Boolean(props.open) && !showEnvelope) : damp(open, Number(Boolean(props.open) && !showEnvelope), 8.7, dt);
    pitch = damp(pitch, requestedPitch, 14, dt);
    yaw = damp(yaw, requestedYaw, 14, dt);

    const selected = createBook(activeSlug, draft);
    if (activeDraft !== draft || activeSticker !== selectedSticker) {
      selected.book.update(draft, selectedSticker);
      activeDraft = draft;
      activeSticker = selectedSticker;
    }

    if (gallery) {
      for (const item of TEMPLATES) createBook(item.slug, draft);
    }

    if (width && height) {
      const aspect = width / height;
      // During the exchange, the scene accommodates the upright open liner on the same stage.
      const wideBook = (CARD_WIDTH * 2 + .56) / aspect;
      const envelopeView = (ENVELOPE_WIDTH + .44) / aspect;
      const baseSize = mobile && mode !== "gallery" ? Math.max(5.40, 3.85 / aspect) : resolution(aspect);
      const openFit = Math.max(baseSize, wideBook);
      const envFit = showEnvelope ? Math.max(baseSize, envelopeView, breaking || packaging ? 6.15 : 0) : baseSize;
      const desiredSize = showEnvelope ? envFit : mix(baseSize, openFit, open);
      cameraSize = !cameraSize || initial || reducedMotion ? desiredSize : damp(cameraSize, desiredSize, 10, dt);
      updateProjection(aspect, cameraSize);
    }

    const drift = reducedMotion ? 0 : Math.sin(elapsed * 1.18) * .021;
    for (const [slug, entry] of books) {
      const active = slug === activeSlug;
      const { book, shadow, contact } = entry;
      const sideSlot = gallery ? GALLERY_SLOTS[galleryOffset(slug, activeSlug)] : GALLERY_SLOTS[0];
      const visible = active ? displayBook : gallery && open < .76;
      book.root.visible = shadow.visible = contact.visible = visible;
      if (!visible) continue;

      if (gallery) {
        const mobileX = mobile ? .86 : 1;
        const direction = Math.sign(sideSlot.x);
        const displaced = active ? sideSlot.x + open * CARD_WIDTH / 2 : (sideSlot.x + direction * open * 1.65) * mobileX;
        const scale = active ? 1 : sideSlot.scale * (mobile && sideSlot.z < -1 ? .93 : 1) * (1 - open * .70);
        updateBookPose(
          book, displaced, sideSlot.y + drift * (active ? 1 : .4), sideSlot.z,
          sideSlot.pitch + (active ? pitch : 0), sideSlot.yaw * (1 - open * .75) + (active ? yaw : 0),
          sideSlot.roll * (1 - open * .84), scale, active ? open : 0, dt, reducedMotion,
        );
        updateBookShadow(entry, active ? .47 : .31 * (1 - open), active ? open * 1.55 : 0);
      } else if (packaging) {
        const lift = span(time, .12, .89);
        const insert = span(time, 1.09, 1.98);
        const rotation = span(time, .24, .91);
        const x = mix(open * CARD_WIDTH / 2, 0, lift);
        const y = mix(lift * 1.72, -.18, insert);
        const z = mix(.92, .097, span(time, .8, 1.24));
        const scale = mix(1, .88, rotation);
        updateBookPose(book, x, y, z, .055 * (1 - rotation), -.07 * (1 - rotation), mix(-.025, Math.PI / 2, rotation), scale, open, dt, true);
        updateBookShadow(entry, .32 * (1 - insert));
      } else if (breaking) {
        const pull = span(time, .59, 1.38);
        const center = span(time, 1.36, 2.15);
        const rotation = span(time, 1.08, 1.92);
        const x = -.05 * pull;
        const y = mix(-.16 + pull * 1.95, .04, center);
        const z = mix(.087, .9, span(time, .86, 1.43));
        updateBookPose(book, x, y, z, .057 * center, -.078 * center, mix(Math.PI / 2, -.025, rotation), mix(.88, 1, rotation), 0, dt, true);
        updateBookShadow(entry, pull * .43);
      } else {
        const x = open * CARD_WIDTH / 2;
        const baseYaw = -.10 * (1 - open * .84);
        updateBookPose(book, x, .035 + drift, .30, .057 + pitch, baseYaw + yaw, -.025 * (1 - open * .75), 1, open, dt, initial || reducedMotion);
        updateBookShadow(entry, .46, open * 1.58);
      }
    }

    envelope.root.visible = envShadow.visible = showEnvelope;
    if (showEnvelope) {
      const env = envelope.root;
      let positionY = drift;
      let flap = 0;
      let wax = 0;
      let fracture = 0;
      let envelopeScale = 1;
      const progress = unit(props.sealProgress ?? 0);
      if (packaging) {
        positionY -= 2.34 * (1 - span(time, 0, .73)) + .17 * (1 - span(time, 1.76, 2.31));
        flap = 2.98 * span(time, .10, .65) * (1 - span(time, 1.85, 2.48));
      } else if (breaking) {
        positionY -= 3.18 * span(time, .99, 1.99);
        envelopeScale = mix(1, .8, span(time, 1.16, 2.18));
        flap = 2.98 * span(time, .34, 1.05);
        fracture = span(time, .025, .65);
        wax = 1;
      } else if (envelopePhase === "sealed") {
        wax = .001 + .999 * span(time, 0, .48);
        if (mode === "letter") wax = 1;
      }

      env.position.set(0, positionY, -.12);
      env.rotation.set(.02, -.048, -.014);
      env.scale.setScalar(envelopeScale);
      envelope.update(flap, progress, wax, fracture);
      envShadow.position.x = .16;
      envShadow.position.y = positionY - 1.59;
      envShadow.scale.set(ENVELOPE_WIDTH * 1.28 * envelopeScale, .75, 1);
      envShadow.material.opacity = .44 * (1 - (breaking ? span(time, 1.23, 2.13) : 0));
    }

    if (visible) {
      renderer.render(scene, camera);
      if (initial) available(true);
      initial = false;
    }

    if (!completed && ((packaging && time >= 2.5) || (breaking && time >= 2.22))) {
      completed = true;
      props.onReady?.();
    }
  }

  frame = requestAnimationFrame(render);

  function pointAt(clientX: number, clientY: number) {
    const bounds = host.getBoundingClientRect();
    pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  function paperPoint(clientX: number, clientY: number) {
    const entry = books.get(read().draft.template);
    if (!entry) return;
    pointAt(clientX, clientY);
    const { rightInner } = entry.book;
    const surface = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).transformDirection(rightInner.matrixWorld),
      new THREE.Vector3().setFromMatrixPosition(rightInner.matrixWorld),
    );
    const point = raycaster.ray.intersectPlane(surface, new THREE.Vector3());
    if (!point) return;
    rightInner.worldToLocal(point);
    return { x: point.x / CARD_WIDTH + .5, y: .5 - point.y / (CARD_WIDTH / .75) };
  }

  function hit(clientX: number, clientY: number): SceneHit {
    const props = read();
    if (props.envelope && props.envelope !== "opened" && props.envelope !== "none") return {};
    pointAt(clientX, clientY);
    const allTargets = [...books.values()].filter(({ book }) => book.root.visible);
    const nearest = raycaster.intersectObjects(allTargets.flatMap(({ book }) => book.targets))[0];
    const entry = allTargets.find(({ book }) => book.targets.some((target) => target === nearest?.object));
    if (!nearest || !entry) return {};
    const slug = entry.book.slug;
    if (props.mode !== "editor" || slug !== props.draft.template || nearest.object !== entry.book.rightInner || !nearest.uv || open < .79) return { slug };
    const x = nearest.uv.x;
    const y = 1 - nearest.uv.y;
    const found = [...props.draft.stickers].reverse().find((item) => {
      const radius = STICKER_BASE_SIZE / 2 * item.scale;
      return Math.abs(item.x - x) <= radius && Math.abs(item.y - y) <= radius * .75;
    });
    return { slug, sticker: found?.id, x: found ? x - found.x : x, y: found ? y - found.y : y };
  }

  function rotate(dx: number, dy: number) {
    requestedYaw = THREE.MathUtils.clamp(requestedYaw + dx * .006, -.73, .73);
    requestedPitch = THREE.MathUtils.clamp(requestedPitch + dy * .006, -.49, .49);
    wake();
  }

  function destroy() {
    observer.disconnect();
    intersection.disconnect();
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", resume);
    reduced.removeEventListener("change", resume);
    renderer.domElement.removeEventListener("webglcontextlost", handleContextLoss);
    document.fonts?.removeEventListener("loadingdone", refreshFonts);
    for (const { book } of books.values()) book.deactivate();
    disposeScene(scene, allMaps);
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { destroy, hit, rotate, paperPoint };
}

export type SceneStage = NonNullable<ReturnType<typeof createStage>>;
