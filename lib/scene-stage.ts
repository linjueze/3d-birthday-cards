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
  focusMessage?: boolean;
  className?: string;
};

export const FALLBACK_TIMINGS = { packing: 2600, breaking: 2400 } as const;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.4;

type Book = ReturnType<typeof buildBook>;
type Slot = { x: number; z: number; y: number; pitch: number; yaw: number; roll: number; scale: number };

// Orthographic Z separation guarantees the active card never clips rear cards even at max yaw, mid-flip, or during template switches.
export const GALLERY_SLOTS: readonly Slot[] = [
  { x: .04, z: 2.8, y: .04, pitch: .057, yaw: -.078, roll: -.025, scale: 1 },
  { x: -1.65, z: -1.6, y: .055, pitch: .052, yaw: .31, roll: .164, scale: .83 },
  { x: 1.72, z: -2.8, y: -.065, pitch: .063, yaw: -.39, roll: -.19, scale: .84 },
  { x: -2.71, z: -4.2, y: -.155, pitch: .085, yaw: .54, roll: .303, scale: .724 },
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
  onZoomChange?: (zoom: number) => void,
  onWaxAnchor?: (xPct: number, yPct: number) => void,
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  envShadow.position.z = -5.0;
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
  let requestedZoom = 1;
  let zoom = 1;
  let requestedPanX = 0;
  let requestedPanY = 0;
  let panX = 0;
  let panY = 0;
  let activeFocusMessage = Boolean(read().focusMessage);
  let lastWaxX = -1;
  let lastWaxY = -1;
  const waxWorld = new THREE.Vector3();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const damp = THREE.MathUtils.damp;
  const mix = THREE.MathUtils.lerp;

  function wake(duration = 690) {
    renderUntil = Math.max(renderUntil, performance.now() + duration);
  }

  function clampPan(zLevel = requestedZoom) {
    if (!width || !height || !cameraSize || zLevel <= 1.001) {
      requestedPanX = 0;
      requestedPanY = 0;
      return;
    }
    const aspect = width / height;
    const factor = 1 - 1 / zLevel;
    const maxX = cameraSize * aspect * .54 * factor;
    const maxY = cameraSize * .52 * factor;
    requestedPanX = THREE.MathUtils.clamp(requestedPanX, -maxX, maxX);
    requestedPanY = THREE.MathUtils.clamp(requestedPanY, -maxY, maxY);
  }

  function createBook(slug: TemplateSlug, draft: CardDraft, isPriority = slug === activeSlug) {
    let entry = books.get(slug);
    if (!entry) {
      const book = buildBook(slug, draft, allMaps, wake, isPriority);
      const shadow = createShadow(.38);
      const contact = createShadow(.23);
      shadow.position.z = -5.2;
      contact.position.z = -5.2;
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
    updateProjection(width / height, cameraSize / zoom);
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
    const idleInterval = reducedMotion ? Number.POSITIVE_INFINITY : width < 500 ? 33 : 20;
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
      if (requestedZoom !== 1 || requestedPanX !== 0 || requestedPanY !== 0) {
        requestedZoom = 1;
        requestedPanX = 0;
        requestedPanY = 0;
        onZoomChange?.(1);
      }
    }

    if (activeEnvelope !== envelopePhase) {
      activeEnvelope = envelopePhase;
      animationTime = now;
      completed = false;
      if (envelopePhase !== "none" && envelopePhase !== "opened") {
        requestedPitch = 0;
        requestedYaw = 0;
        if (requestedZoom !== 1 || requestedPanX !== 0 || requestedPanY !== 0) {
          requestedZoom = 1;
          requestedPanX = 0;
          requestedPanY = 0;
          onZoomChange?.(1);
        }
      }
    }

    const wantFocus = Boolean(props.focusMessage) && Boolean(props.open) && ! (envelopePhase !== "none" && envelopePhase !== "opened");
    if (activeFocusMessage !== wantFocus) {
      activeFocusMessage = wantFocus;
      if (wantFocus) {
        requestedZoom = 1.85;
        requestedPitch = 0;
        requestedYaw = 0;
        requestedPanX = CARD_WIDTH * .48;
        requestedPanY = 0;
        onZoomChange?.(1.85);
      } else if (requestedZoom > 1.01) {
        requestedZoom = 1;
        requestedPanX = 0;
        requestedPanY = 0;
        onZoomChange?.(1);
      }
      wake(900);
    }

    const wallTime = now - animationTime;
    const time = reducedMotion && wallTime >= 125 ? 3 : wallTime / 1000;
    const showEnvelope = envelopePhase !== "none" && envelopePhase !== "opened";
    const packaging = envelopePhase === "packing";
    const breaking = envelopePhase === "breaking";
    // During packing keep the tucked card visible inside the V-cutout until the closing flap covers it;
    // during breaking reveal the card inside the pocket as soon as the flap starts lifting.
    const displayBook = !showEnvelope || (packaging && time < 2.28) || (breaking && time > .45);
    open = reducedMotion ? Number(Boolean(props.open) && !showEnvelope) : damp(open, Number(Boolean(props.open) && !showEnvelope), 8.7, dt);
    pitch = damp(pitch, requestedPitch, 14, dt);
    yaw = damp(yaw, requestedYaw, 14, dt);
    zoom = reducedMotion ? requestedZoom : damp(zoom, requestedZoom, 12, dt);
    panX = reducedMotion ? requestedPanX : damp(panX, requestedPanX, 12, dt);
    panY = reducedMotion ? requestedPanY : damp(panY, requestedPanY, 12, dt);

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
      // During the exchange, reserve vertical headroom for the card rising cleanly clear of the envelope mouth.
      const wideBook = (CARD_WIDTH * 2 + .56) / aspect;
      const envelopeView = (ENVELOPE_WIDTH + .44) / aspect;
      const baseSize = mobile && mode !== "gallery" ? Math.max(5.40, 3.85 / aspect) : resolution(aspect);
      const openFit = Math.max(baseSize, wideBook);
      const envFit = showEnvelope ? Math.max(baseSize, envelopeView, breaking || packaging ? 7.25 : 0) : baseSize;
      const desiredSize = showEnvelope ? envFit : mix(baseSize, openFit, open);
      cameraSize = !cameraSize || initial || reducedMotion ? desiredSize : damp(cameraSize, desiredSize, 10, dt);
      clampPan(requestedZoom);
      updateProjection(aspect, cameraSize / zoom);
      camera.position.set(panX, panY, 14);
    }

    const drift = reducedMotion ? 0 : Math.sin(elapsed * 1.18) * .021;
    const envSlotY = -.76;
    const cardAboveY = 2.26;
    const cardPocketZ = .08;
    const packEnvY = -3.1 * (1 - span(time, 0, .64)) + envSlotY * (1 - span(time, 1.88, 2.55));
    const breakEnvY = envSlotY * span(time, .24, .78) - 3.8 * span(time, 1.56, 2.34);

    for (const [slug, entry] of books) {
      const active = slug === activeSlug;
      const { book, shadow, contact } = entry;
      const sideSlot = gallery ? GALLERY_SLOTS[galleryOffset(slug, activeSlug)] : GALLERY_SLOTS[0];
      const visible = active ? displayBook : gallery && open < .76;
      book.root.visible = shadow.visible = contact.visible = visible;
      if (!visible) continue;
      book.animate(elapsed, active ? yaw : sideSlot.yaw * .3, active ? pitch : 0, active ? open : 0, reducedMotion);

      if (gallery) {
        const mobileX = mobile ? .86 : 1;
        const direction = Math.sign(sideSlot.x);
        const displaced = active ? sideSlot.x + open * CARD_WIDTH / 2 : (sideSlot.x + direction * open * 1.65) * mobileX;
        const scale = active ? 1 : sideSlot.scale * (mobile && sideSlot.z < -3.5 ? .93 : 1) * (1 - open * .70);
        const travel = Math.abs(book.root.position.x - displaced);
        const targetZ = active ? sideSlot.z + Math.min(1.1, travel * .55) : sideSlot.z - Math.min(.9, travel * .3);
        updateBookPose(
          book, displaced, sideSlot.y + drift * (active ? 1 : .4), targetZ,
          sideSlot.pitch + (active ? pitch : 0), sideSlot.yaw * (1 - open * .75) + (active ? yaw : 0),
          sideSlot.roll * (1 - open * .84), scale, active ? open : 0, dt, reducedMotion,
        );
        updateBookShadow(entry, active ? .47 : .31 * (1 - open), active ? open * 1.55 : 0);
      } else if (packaging) {
        const prep = span(time, .04, .78);
        const insert = span(time, .86, 1.72);
        const followEnv = span(time, 1.88, 2.55);
        const x = mix(open * CARD_WIDTH / 2, 0, prep);
        const y = insert > 0
          ? mix(cardAboveY, envSlotY * (1 - followEnv), insert)
          : mix(.035, cardAboveY, prep);
        const z = mix(.30, cardPocketZ, span(time, .08, .72));
        const scale = mix(1, .84, prep);
        updateBookPose(book, x, y, z, .057 * (1 - prep), -.10 * (1 - prep), mix(-.025, Math.PI / 2, prep), scale, open, dt, true);
        updateBookShadow(entry, .32 * (1 - insert));
      } else if (breaking) {
        const pull = span(time, .82, 1.54);
        const present = span(time, 1.56, 2.34);
        const x = 0;
        const y = present > 0
          ? mix(cardAboveY, .035, present)
          : mix(breakEnvY, cardAboveY, pull);
        const z = mix(cardPocketZ, .30, span(time, 1.62, 2.30));
        const scale = mix(.84, 1, present);
        updateBookPose(book, x, y, z, .057 * present, -.10 * present, mix(Math.PI / 2, -.025, present), scale, 0, dt, true);
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
      let envRx = .02;
      let envRy = -.048;
      let envRz = -.014;
      let flap = 0;
      let wax = 0;
      let fracture = 0;
      let envelopeScale = 1;
      const progress = unit(props.sealProgress ?? 0);
      if (packaging) {
        positionY = packEnvY;
        // Keep envelope strictly parallel to card during insertion, then settle to poised tilt once sealed shut.
        const settleTilt = span(time, 2.24, 2.58);
        envRx *= settleTilt;
        envRy *= settleTilt;
        envRz *= settleTilt;
        flap = 3.06 * span(time, .06, .62) * (1 - span(time, 1.85, 2.52));
      } else if (breaking) {
        positionY = breakEnvY;
        const flattenTilt = 1 - span(time, 0, .42);
        envRx *= flattenTilt;
        envRy *= flattenTilt;
        envRz *= flattenTilt;
        envelopeScale = mix(1, .84, span(time, 1.56, 2.34));
        flap = 3.06 * span(time, .22, .78);
        fracture = span(time, .02, .58);
        wax = 1;
      } else if (envelopePhase === "sealed") {
        wax = .001 + .999 * span(time, 0, .48);
        if (mode === "letter") wax = 1;
      }

      env.position.set(0, positionY, -.12);
      env.rotation.set(envRx, envRy, envRz);
      env.scale.setScalar(envelopeScale);
      envelope.update(flap, progress, wax, fracture);
      if (onWaxAnchor && (envelopePhase === "unsealed" || envelopePhase === "sealed")) {
        env.updateMatrixWorld(true);
        envelope.waxSpot.getWorldPosition(waxWorld);
        waxWorld.project(camera);
        const wx = Math.round(((waxWorld.x + 1) * 50) * 10) / 10;
        const wy = Math.round(((1 - waxWorld.y) * 50) * 10) / 10;
        if (Math.abs(wx - lastWaxX) >= .2 || Math.abs(wy - lastWaxY) >= .2) {
          lastWaxX = wx;
          lastWaxY = wy;
          onWaxAnchor(wx, wy);
        }
      }
      envShadow.position.x = .16;
      envShadow.position.y = positionY - 1.59;
      envShadow.scale.set(ENVELOPE_WIDTH * 1.28 * envelopeScale, .75, 1);
      envShadow.material.opacity = .44 * (1 - (breaking ? span(time, 1.56, 2.26) : 0));
    }

    if (visible) {
      renderer.render(scene, camera);
      if (initial) available(true);
      initial = false;
    }

    if (!completed && ((packaging && time >= 2.6) || (breaking && time >= 2.4))) {
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

  function zoomTo(nextZoom: number) {
    const props = read();
    if (props.envelope && props.envelope !== "none" && props.envelope !== "opened") return 1;
    const prev = requestedZoom;
    const clamped = Math.round(THREE.MathUtils.clamp(nextZoom, MIN_ZOOM, MAX_ZOOM) * 100) / 100;
    requestedZoom = clamped;
    // On narrow portrait screens, zooming into an unfolded card naturally biases toward the right message page.
    if (prev <= 1.05 && clamped > 1.15 && props.open && width > 0 && height > 0 && width / height < 1.15 && Math.abs(requestedPanX) < .05) {
      requestedPanX = CARD_WIDTH * .44;
    }
    clampPan(clamped);
    wake(900);
    onZoomChange?.(clamped);
    return clamped;
  }

  function zoomBy(factor: number) {
    return zoomTo(requestedZoom * factor);
  }

  function pan(dx: number, dy: number) {
    if (requestedZoom <= 1.01 || !height || !cameraSize) return;
    const unitsPerPx = (cameraSize / zoom) / height;
    requestedPanX -= dx * unitsPerPx;
    requestedPanY += dy * unitsPerPx;
    clampPan(requestedZoom);
    wake();
  }

  function resetView() {
    requestedZoom = 1;
    requestedPanX = 0;
    requestedPanY = 0;
    requestedPitch = 0;
    requestedYaw = 0;
    wake(900);
    onZoomChange?.(1);
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

  return { destroy, hit, rotate, paperPoint, zoomTo, zoomBy, pan, resetView };
}

export type SceneStage = NonNullable<ReturnType<typeof createStage>>;
