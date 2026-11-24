import * as THREE from "three";
import type { TemplateSlug } from "./cards";

function makeCanvas(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowSprite() {
  return makeCanvas(128, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(255, 245, 210, 1)");
    g.addColorStop(.28, "rgba(255, 212, 128, .72)");
    g.addColorStop(.62, "rgba(255, 178, 86, .22)");
    g.addColorStop(1, "rgba(255, 170, 70, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

function flameSprite() {
  return makeCanvas(128, (ctx, s) => {
    ctx.translate(s / 2, s * .72);
    const outer = ctx.createRadialGradient(0, -14, 2, 0, -14, 38);
    outer.addColorStop(0, "rgba(255, 250, 224, .95)");
    outer.addColorStop(.42, "rgba(255, 205, 108, .75)");
    outer.addColorStop(.82, "rgba(245, 148, 52, .25)");
    outer.addColorStop(1, "rgba(240, 120, 40, 0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-22, 6, -16, -26, 0, -52);
    ctx.bezierCurveTo(16, -26, 22, 6, 0, 12);
    ctx.fill();

    const core = ctx.createRadialGradient(0, -8, 1, 0, -8, 18);
    core.addColorStop(0, "rgba(255, 255, 248, 1)");
    core.addColorStop(.65, "rgba(255, 232, 165, .85)");
    core.addColorStop(1, "rgba(255, 195, 95, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-10, 2, -8, -14, 0, -28);
    ctx.bezierCurveTo(8, -14, 10, 2, 0, 6);
    ctx.fill();
  });
}

function starSprite() {
  return makeCanvas(128, (ctx, s) => {
    const c = s / 2;
    const halo = ctx.createRadialGradient(c, c, 0, c, c, c * .78);
    halo.addColorStop(0, "rgba(255, 246, 214, .95)");
    halo.addColorStop(.35, "rgba(246, 214, 138, .42)");
    halo.addColorStop(1, "rgba(246, 214, 138, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, s, s);

    ctx.fillStyle = "#fff6db";
    ctx.beginPath();
    const outer = s * .42;
    const inner = s * .075;
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / 4;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  });
}

function cometSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(8, 32, 246, 32);
  grad.addColorStop(0, "rgba(255, 232, 170, 0)");
  grad.addColorStop(.52, "rgba(255, 224, 148, .35)");
  grad.addColorStop(.86, "rgba(255, 244, 206, .88)");
  grad.addColorStop(1, "rgba(255, 252, 238, 1)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(8, 32);
  ctx.quadraticCurveTo(145, 25, 244, 28);
  ctx.lineTo(244, 36);
  ctx.quadraticCurveTo(145, 39, 8, 32);
  ctx.fill();

  const head = ctx.createRadialGradient(240, 32, 1, 240, 32, 18);
  head.addColorStop(0, "rgba(255, 255, 245, 1)");
  head.addColorStop(.45, "rgba(255, 228, 152, .7)");
  head.addColorStop(1, "rgba(255, 220, 140, 0)");
  ctx.fillStyle = head;
  ctx.fillRect(216, 8, 40, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function petalSprite() {
  return makeCanvas(128, (ctx, s) => {
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-.25);
    const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 48);
    g.addColorStop(0, "rgba(255, 235, 233, .96)");
    g.addColorStop(.55, "rgba(240, 186, 186, .9)");
    g.addColorStop(1, "rgba(210, 138, 142, .8)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.bezierCurveTo(32, -32, 36, 18, 0, 42);
    ctx.bezierCurveTo(-34, 22, -30, -30, 0, -40);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 244, 240, .45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(4, 0, -2, 30);
    ctx.stroke();
  });
}

function confettiSprite() {
  return makeCanvas(64, (ctx, s) => {
    const g = ctx.createLinearGradient(12, 8, 52, 56);
    g.addColorStop(0, "#fff4cf");
    g.addColorStop(.45, "#e6c077");
    g.addColorStop(.8, "#fff0bd");
    g.addColorStop(1, "#c49448");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(14, 18, 36, 24, 6);
    ctx.fill();
  });
}

export interface FoilSheen {
  mesh: THREE.Mesh;
  setMap: (texture: THREE.Texture) => void;
  update: (elapsed: number, yaw: number, pitch: number, open: number, reduced: boolean) => void;
}

/**
 * Flowing diagonal gold-foil sheen masked strictly by foil.webp's alpha so only metallic
 * borders, filigree, lettering, and gold accents catch luminous sweeping glints.
 */
export function createFoilSheen(width: number, height: number, foilMap: THREE.Texture, darkTheme: boolean): FoilSheen {
  const uniforms = {
    uMap: { value: foilMap },
    uSweep: { value: 0 },
    uTilt: { value: new THREE.Vector2(0, 0) },
    uOpacity: { value: darkTheme ? .82 : .64 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uSweep;
      uniform vec2 uTilt;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        if (tex.a < 0.04) discard;
        float diag = vUv.x * 0.78 + (1.0 - vUv.y) * 0.62;
        // Primary slow breathing diagonal light sweep across gold foil
        float band1 = exp(-pow((diag - uSweep) * 6.2, 2.0));
        // Secondary interactive specular shimmer driven directly by card rotation tilt
        float tiltCenter = 0.68 + uTilt.x * 0.68 - uTilt.y * 0.45;
        float band2 = exp(-pow((diag - tiltCenter) * 4.4, 2.0)) * 0.58;
        float glint = (band1 * 0.72 + band2) * tex.a * uOpacity;
        vec3 goldTint = mix(vec3(1.0, 0.91, 0.68), vec3(1.0, 0.97, 0.86), clamp(band1, 0.0, 1.0));
        gl_FragColor = vec4(goldTint * glint, glint);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.renderOrder = 4;

  return {
    mesh,
    setMap(texture: THREE.Texture) {
      uniforms.uMap.value = texture;
    },
    update(elapsed: number, yaw: number, pitch: number, open: number, reduced: boolean) {
      const vis = Math.max(0, 1 - open * 3.2);
      mesh.visible = vis > .01;
      if (!mesh.visible) return;
      // 5.4s calm luxury cadence: sweeps smoothly for ~2.6s then rests gently
      const cycle = (elapsed % 5.4) / 2.7;
      const sweep = reduced ? -2.0 : (cycle <= 1 ? -0.35 + cycle * 2.15 : 2.2);
      uniforms.uSweep.value = sweep;
      uniforms.uTilt.value.set(yaw, pitch);
      uniforms.uOpacity.value = (darkTheme ? .82 : .64) * vis;
    },
  };
}

export interface CoverLivingFX {
  group: THREE.Group;
  update: (elapsed: number, open: number, reduced: boolean) => void;
}

/**
 * Theme-specific 3D living micro-animations anchored cleanly onto the front cover plane.
 * All layers stay inside the card face and fade away gracefully as the cover opens.
 */
export function createCoverLivingFX(slug: TemplateSlug): CoverLivingFX {
  const group = new THREE.Group();
  const updaters: ((elapsed: number, vis: number, reduced: boolean) => void)[] = [];

  if (slug === "candlelight-cake") {
    const flameTex = flameSprite();
    const glowTex = glowSprite();
    const starTex = starSprite();

    // Calibrated exact wick positions on candlelight-cake/base.webp
    const candles = [
      { x: -.199, y: .333, phase: .0, scale: .92 },
      { x: .004, y: .367, phase: 1.7, scale: 1.04 },
      { x: .201, y: .322, phase: 3.1, scale: .92 },
    ];
    for (const c of candles) {
      const haloMat = new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .48,
      });
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(.46 * c.scale, .46 * c.scale), haloMat);
      halo.position.set(c.x, c.y + .02, .002);
      halo.renderOrder = 5;

      const flameMat = new THREE.MeshBasicMaterial({
        map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .78,
      });
      const flame = new THREE.Mesh(new THREE.PlaneGeometry(.15 * c.scale, .23 * c.scale), flameMat);
      flame.position.set(c.x, c.y + .035, .005);
      flame.renderOrder = 6;
      group.add(halo, flame);

      updaters.push((t, vis, reduced) => {
        const flick = reduced ? 0 : Math.sin(t * 7.2 + c.phase) * .5 + Math.sin(t * 13.4 + c.phase * 1.9) * .3 + Math.cos(t * 4.3 + c.phase) * .2;
        const sway = reduced ? 0 : Math.sin(t * 3.7 + c.phase) * .055;
        flame.scale.set(1 - flick * .06, 1 + flick * .12, 1);
        flame.rotation.z = sway;
        flameMat.opacity = (.74 + flick * .14) * vis;
        const haloPulse = 1 + flick * .09;
        halo.scale.setScalar(haloPulse);
        haloMat.opacity = (.42 + flick * .1) * vis;
      });
    }

    // 10 rising golden wish embers / micro-sparkles above the candles
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
      });
      const size = .055 + (i % 3) * .022;
      const spark = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      spark.renderOrder = 6;
      group.add(spark);
      const baseX = (i % 3 - 1) * .21 + Math.sin(i * 2.1) * .09;
      const speed = .14 + (i % 4) * .03;
      const offset = i * .37;
      updaters.push((t, vis, reduced) => {
        if (reduced) { mat.opacity = 0; return; }
        const p = (t * speed + offset) % 1;
        spark.position.set(baseX + Math.sin(p * Math.PI * 2 + i) * .06, .34 + p * .58, .006);
        const fade = Math.sin(p * Math.PI);
        const twinkle = .65 + .35 * Math.sin(t * 6.5 + i * 2.3);
        mat.opacity = fade * twinkle * .72 * vis;
        spark.scale.setScalar(.7 + fade * .45);
      });
    }
  } else if (slug === "starry-wish") {
    const starTex = starSprite();
    const cometTex = cometSprite();

    // 12 twinkling stars inside the midnight-indigo arch
    const stars = [
      [-.62, .62, .11], [-.34, .34, .08], [.42, .48, .12], [.62, .18, .09],
      [-.54, -.04, .08], [.54, -.36, .11], [-.44, -.72, .09], [.18, -.92, .1],
      [.64, -.82, .08], [-.06, .14, .07], [.34, -.12, .08], [-.66, .26, .09],
    ] as const;
    stars.forEach(([sx, sy, sz], i) => {
      const mat = new THREE.MeshBasicMaterial({
        map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .6,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat);
      mesh.position.set(sx, sy, .005);
      mesh.renderOrder = 5;
      group.add(mesh);
      updaters.push((t, vis, reduced) => {
        const tw = reduced ? .55 : .25 + .75 * (.5 + .5 * Math.sin(t * (2.2 + (i % 4) * .55) + i * 1.4));
        mat.opacity = tw * .82 * vis;
        mesh.scale.setScalar(.72 + tw * .42);
      });
    });

    // 3 hanging gold star glints swaying softly like a delicate wind chime
    const pendants = [
      { ax: -.70, ay: .65, len: .62, phase: .2 },
      { ax: .02, ay: -.35, len: .56, phase: 1.8 },
      { ax: .38, ay: -.30, len: .42, phase: 3.1 },
    ];
    for (const p of pendants) {
      const mat = new THREE.MeshBasicMaterial({
        map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .7,
      });
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(.15, .15), mat);
      glint.renderOrder = 6;
      group.add(glint);
      updaters.push((t, vis, reduced) => {
        const angle = reduced ? 0 : Math.sin(t * 1.35 + p.phase) * .065;
        glint.position.set(p.ax + Math.sin(angle) * p.len, p.ay - Math.cos(angle) * p.len, .007);
        const pulse = reduced ? .6 : .55 + .45 * Math.sin(t * 3.2 + p.phase);
        mat.opacity = pulse * .85 * vis;
      });
    }

    // Periodic golden shooting-star comet streaking gracefully across the upper-right indigo sky
    const cometMat = new THREE.MeshBasicMaterial({
      map: cometTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
    });
    const comet = new THREE.Mesh(new THREE.PlaneGeometry(.82, .20), cometMat);
    comet.rotation.z = -.48;
    comet.renderOrder = 6;
    group.add(comet);
    updaters.push((t, vis, reduced) => {
      if (reduced) { cometMat.opacity = 0; return; }
      const cycle = t % 4.8;
      if (cycle > 1.25) { cometMat.opacity = 0; return; }
      const p = cycle / 1.25;
      const ease = 1 - Math.pow(1 - p, 2);
      comet.position.set(.05 + ease * .72, .56 - ease * .38, .008);
      cometMat.opacity = Math.sin(p * Math.PI) * .92 * vis;
    });
  } else if (slug === "bloom-garden") {
    const petalTex = petalSprite();
    const glowTex = glowSprite();

    // 6 translucent hand-painted blush rose petals gently drifting & rotating across the botanical arch
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: petalTex, transparent: true, depthWrite: false, opacity: 0,
      });
      const size = .15 + (i % 3) * .035;
      const petal = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      petal.renderOrder = 6;
      group.add(petal);
      const startX = -.68 + (i / 5) * 1.1;
      const speed = .072 + (i % 3) * .018;
      const offset = i * .19;
      updaters.push((t, vis, reduced) => {
        if (reduced) { mat.opacity = 0; return; }
        const p = (t * speed + offset) % 1;
        const x = startX + p * .42 + Math.sin(p * Math.PI * 2.4 + i) * .12;
        const y = .74 - p * 1.56;
        petal.position.set(x, y, .008 + (i % 2) * .003);
        petal.rotation.z = t * (.45 + (i % 3) * .18) + i;
        petal.rotation.x = Math.sin(t * 1.4 + i) * .5;
        const fade = Math.sin(p * Math.PI);
        mat.opacity = Math.min(1, fade * 1.35) * .84 * vis;
      });
    }

    // 8 warm golden pollen motes drifting softly near the wreath & mini wax-sealed envelope
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
      });
      const size = .075 + (i % 3) * .025;
      const mote = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      mote.renderOrder = 5;
      group.add(mote);
      const ang = (i / 8) * Math.PI * 2;
      const rad = .42 + (i % 3) * .16;
      updaters.push((t, vis, reduced) => {
        const a = ang + (reduced ? 0 : t * .18);
        mote.position.set(Math.cos(a) * rad, -.18 + Math.sin(a) * rad * 1.05 + (reduced ? 0 : Math.sin(t * 1.1 + i) * .04), .005);
        const pulse = reduced ? .45 : .3 + .7 * (.5 + .5 * Math.sin(t * 2.1 + i * 1.7));
        mat.opacity = pulse * .55 * vis;
      });
    }
  } else if (slug === "confetti-atelier") {
    const confTex = confettiSprite();
    const starTex = starSprite();
    const glowTex = glowSprite();

    // 12 champagne-gold foil confetti ribbons & stars drifting down and tumbling with metallic glints
    for (let i = 0; i < 12; i++) {
      const isStar = i % 3 === 0;
      const mat = new THREE.MeshBasicMaterial({
        map: isStar ? starTex : confTex,
        transparent: true,
        depthWrite: false,
        blending: isStar ? THREE.AdditiveBlending : THREE.NormalBlending,
        opacity: 0,
      });
      const w = isStar ? .11 : .085;
      const h = isStar ? .11 : .055;
      const piece = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      piece.renderOrder = 6;
      group.add(piece);
      const baseX = -.74 + ((i * 37) % 100) / 100 * 1.48;
      const speed = .095 + (i % 4) * .022;
      const offset = i * .13;
      updaters.push((t, vis, reduced) => {
        if (reduced) { mat.opacity = 0; return; }
        const p = (t * speed + offset) % 1;
        const x = baseX + Math.sin(p * Math.PI * 2.6 + i) * .1;
        const y = .76 - p * 1.66;
        piece.position.set(x, y, .007 + (i % 2) * .002);
        piece.rotation.z = t * (1.2 + (i % 3) * .4) + i;
        // Simulate 3D foil ribbon flip shimmer
        const flip = Math.cos(t * (2.6 + (i % 3) * .7) + i);
        piece.scale.set(1, isStar ? .8 + Math.abs(flip) * .35 : .25 + Math.abs(flip) * .75, 1);
        const fade = Math.sin(p * Math.PI);
        mat.opacity = Math.min(1, fade * 1.4) * (isStar ? .85 : .88) * vis;
      });
    }

    // 4 gentle buoyant specular gleams breathing softly over the balloon cluster
    const gleams = [[-.26, .08], [.28, .04], [.01, .26], [.02, -.14]] as const;
    gleams.forEach(([gx, gy], i) => {
      const mat = new THREE.MeshBasicMaterial({
        map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .35,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), mat);
      mesh.position.set(gx, gy, .004);
      mesh.renderOrder = 5;
      group.add(mesh);
      updaters.push((t, vis, reduced) => {
        const floatY = reduced ? 0 : Math.sin(t * 1.7 + i * 1.4) * .03;
        mesh.position.y = gy + floatY;
        const pulse = reduced ? .32 : .24 + .22 * (.5 + .5 * Math.sin(t * 2.2 + i * 1.8));
        mat.opacity = pulse * vis;
      });
    });
  }

  return {
    group,
    update(elapsed: number, open: number, reduced: boolean) {
      const vis = Math.max(0, 1 - open * 3.0);
      group.visible = vis > .01;
      if (!group.visible) return;
      for (const fn of updaters) fn(elapsed, vis, reduced);
    },
  };
}
