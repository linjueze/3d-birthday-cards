import type { TemplateSlug } from "./cards";
import { balloon, blossom, bow, drawPath, ellipse, gift, gold, gradient, leaf, randomFrom, spacedText, star, strawberry } from "./art-ornaments";

export const coverPalette = {
  "candlelight-cake": { top: "#fff1db", middle: "#f5e4c5", bottom: "#e2cba4", ink: "#8c5138", lettering: "#93493f", arch: "#fff6e4", archBottom: "#f4debe", dark: false },
  "starry-wish": { top: "#384664", middle: "#263655", bottom: "#151e39", ink: "#e4c18b", lettering: "#f4d399", arch: "#45516c", archBottom: "#222941", dark: true },
  "bloom-garden": { top: "#dfdfc5", middle: "#c3ceb6", bottom: "#a1ae95", ink: "#586047", lettering: "#5c6350", arch: "#ead9ce", archBottom: "#d6bfac", dark: false },
  "confetti-atelier": { top: "#924c54", middle: "#7e3c48", bottom: "#692f3c", ink: "#efd2a2", lettering: "#fbe0ab", arch: "#a86164", archBottom: "#883d4c", dark: true },
  "sakura-mail": { top: "#f5e3e5", middle: "#e8c8cc", bottom: "#d6adb2", ink: "#7c3f4d", lettering: "#8a4253", arch: "#fdf5f2", archBottom: "#f3dfe0", dark: false },
  "teddy-birthday": { top: "#f5e6d2", middle: "#e2c6a6", bottom: "#cca982", ink: "#6d4531", lettering: "#784930", arch: "#fbf4e8", archBottom: "#eedcc3", dark: false },
  "atelier-tea": { top: "#e4ebd9", middle: "#cfd9c5", bottom: "#b4c3a8", ink: "#51604a", lettering: "#4e5d46", arch: "#f8f4e8", archBottom: "#eae2ce", dark: false },
} satisfies Record<TemplateSlug, Record<string, string | boolean>>;

function arch(inset: number) {
  const left = 101 + inset;
  const right = 667 - inset;
  const top = 109 + inset;
  const base = 913 - inset;
  return `M ${left} ${base} L ${left} 413 C ${left} ${265 + inset} 223 ${top} 384 ${top} C 545 ${top} ${right} ${265 + inset} ${right} 413 L ${right} ${base} Z`;
}

export function drawPaperGrain(ctx: CanvasRenderingContext2D, width: number, height: number, density: number, seed: number, strength = 1) {
  const random = randomFrom(seed);
  ctx.save();
  for (let index = 0; index < density; index++) {
    const x = random() * width;
    const y = random() * height;
    const length = .4 + random() * 4;
    const angle = random() * Math.PI;
    ctx.globalAlpha = (.055 + random() * .12) * strength;
    ctx.strokeStyle = index % 3 === 0 ? "#633d2c" : "#fff7e0";
    ctx.lineWidth = .45 + random() * .8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  ctx.restore();
}

export function coverBase(ctx: CanvasRenderingContext2D, slug: TemplateSlug) {
  const palette = coverPalette[slug];
  ctx.fillStyle = gradient(ctx, 40, 36, 672, 977, [[0, palette.top], [.45, palette.middle], [1, palette.bottom]]);
  ctx.fillRect(0, 0, 768, 1024);
  const inner = gradient(ctx, 175, 137, 629, 1024, [[0, palette.arch], [.55, palette.arch], [1, palette.archBottom]]);
  ctx.save();
  ctx.shadowColor = palette.dark ? "#17142359" : "#7d5e3537";
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 12;
  drawPath(ctx, arch(-9), inner);
  ctx.restore();
  drawPaperGrain(ctx, 768, 1024, 22400, 7541, palette.dark ? .85 : .8);
  const vignette = ctx.createRadialGradient(348, 412, 374, 357, 451, 690);
  vignette.addColorStop(0, "#39251600");
  vignette.addColorStop(1, palette.dark ? "#130c1838" : "#71502623");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 768, 1024);
}

function corner(ctx: CanvasRenderingContext2D, x: number, y: number, flipX: number, flipY: number, accent: CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX, flipY);
  drawPath(ctx, "M 82 0 C 54 0 45 4 38 20 C 28 42 45 47 53 37 C 58 31 51 25 47 29 M 0 82 C 0 54 4 45 20 38 C 42 28 47 45 37 53 C 31 58 25 51 29 47 M 8 65 C 5 40 17 22 40 15 C 60 9 72 15 80 26 M 65 8 C 40 5 22 17 15 40 C 9 60 15 72 26 80", undefined, accent, 2.1);
  drawPath(ctx, "M 13 23 C 29 7 41 14 34 21 C 29 25 23 21 13 23 M 23 13 C 7 29 14 41 21 34 C 25 29 21 23 23 13 M 18 18 Q 25 4 42 5 Q 35 12 18 18 M 18 18 Q 4 25 5 42 Q 12 35 18 18", accent);
  for (const [cx, cy] of [[10, 10], [47, 12], [12, 47], [68, 17], [17, 68]]) ellipse(ctx, cx, cy, 2.4, 2.4, accent);
  ctx.restore();
}

function flourish(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, accent: string | CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / 100, width / 100);
  drawPath(ctx, "M -12 0 C -21 -8 -33 -4 -40 -1 C -29 4 -17 3 -12 0 M 12 0 C 21 -8 33 -4 40 -1 C 29 4 17 3 12 0 M -10 4 Q -26 11 -34 7 M 10 4 Q 26 11 34 7", undefined, accent, 1.3);
  star(ctx, 0, 2, 9, accent, 4, .83);
  ellipse(ctx, -46, 0, 1.9, 1.9, accent);
  ellipse(ctx, 46, 0, 1.9, 1.9, accent);
  ctx.restore();
}

function garland(ctx: CanvasRenderingContext2D, x: number, y: number, reflect: number, tint: string | CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(reflect, 1);
  drawPath(ctx, "M 7 86 C 37 57 64 32 116 9 C 69 41 47 75 33 103 M 12 107 C 37 83 61 72 91 65", undefined, tint, 1.6);
  for (let index = 0; index < 8; index++) {
    const cx = 22 + index * 10.1;
    const cy = 74 - index * 7.1;
    drawPath(ctx, `M ${cx} ${cy} q -2 -15 11 -22 q 3 13 -11 22 m 1 -1 q 11 5 24 -5 q -14 -6 -24 5`, undefined, tint, 1.15);
  }
  ellipse(ctx, 117, 9, 2.7, 2.7, tint);
  ctx.restore();
}

export function coverFoil(ctx: CanvasRenderingContext2D, slug: TemplateSlug) {
  const palette = coverPalette[slug];
  const accent = gold(ctx, 140, 1001, palette.dark);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = palette.dark ? "#25142c9b" : "#795b3470";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1.3;
  drawPath(ctx, "M 29 30 H 739 V 994 H 29 Z", undefined, accent, 1.1);
  drawPath(ctx, "M 38 39 H 730 V 985 H 38 Z", undefined, accent, 2.7);
  drawPath(ctx, arch(0), undefined, accent, 3.1);
  drawPath(ctx, arch(11), undefined, accent, 1.25);
  ctx.save();
  ctx.globalAlpha = .55;
  ctx.setLineDash([1, 5]);
  drawPath(ctx, arch(19), undefined, accent, 1.6);
  ctx.restore();
  for (const [x, y, flipX, flipY] of [[43, 44, 1, 1], [725, 44, -1, 1], [43, 980, 1, -1], [725, 980, -1, -1]]) corner(ctx, x, y, flipX, flipY, accent);
  flourish(ctx, 384, 75, 90, accent);
  flourish(ctx, 384, 947, 99, accent);
  garland(ctx, 136, 163, 1, accent);
  garland(ctx, 632, 163, -1, accent);

  const stars: [number, number, number][] = slug === "starry-wish"
    ? [[200,388,15],[571,409,12],[310,430,12],[446,457,14],[527,532,23],[245,523,9],[206,623,12],[557,640,14],[485,720,14],[289,693,12],[363,794,10],[187,731,9],[587,732,18],[493,397,8],[290,781,7]]
    : [[209,411,17],[568,426,14],[181,514,12],[583,526,15],[238,465,9],[516,469,11],[206,640,10],[566,641,9],[196,729,8],[572,741,8],[217,802,9],[551,809,9],[178,806,5],[591,801,5]];
  for (const [x, y, radius] of stars) star(ctx, x, y, radius, accent, 4, .79);
  const random = randomFrom(slug.length * 109);
  for (let index = 0; index < (slug === "starry-wish" ? 158 : 59); index++) {
    const x = 149 + random() * 470;
    const y = 395 + random() * 414;
    if (slug !== "starry-wish" && x > 243 && x < 525) continue;
    ctx.globalAlpha = .35 + random() * .58;
    const radius = .8 + random() * 1.9;
    ellipse(ctx, x, y, radius, radius, accent);
  }
  ctx.restore();
}

function title(ctx: CanvasRenderingContext2D, slug: TemplateSlug) {
  const palette = coverPalette[slug];
  ctx.save();
  ctx.fillStyle = palette.lettering;
  ctx.textAlign = "center";
  ctx.shadowColor = palette.dark ? "#23162571" : "#76382731";
  ctx.shadowBlur = 1.9;
  ctx.shadowOffsetY = 2;
  if (slug === "candlelight-cake") {
    ctx.font = 'italic 89px "Baskerville", "Palatino Linotype", Georgia, serif';
    ctx.fillText("Happy", 377, 312);
    ctx.font = 'italic 105px "Baskerville", "Palatino Linotype", Georgia, serif';
    ctx.fillText("Birthday", 381, 400);
    drawPath(ctx, "M 237 306 C 225 318 187 319 192 304 C 195 294 215 301 217 318 M 523 299 C 540 286 559 294 551 307 C 544 318 516 321 505 327 M 265 410 C 300 426 360 424 391 418 C 427 411 466 403 509 418", undefined, palette.lettering, 1.45);
  } else {
    ctx.font = 'italic 77px "Baskerville", "Palatino Linotype", Georgia, serif';
    ctx.fillText({
      "starry-wish": "Make a",
      "bloom-garden": "Birthday",
      "confetti-atelier": "Let’s",
      "sakura-mail": "With Love",
      "teddy-birthday": "Happy",
      "atelier-tea": "Birthday",
    }[slug], 384, 309);
    ctx.font = 'italic 104px "Baskerville", "Palatino Linotype", Georgia, serif';
    ctx.fillText({
      "starry-wish": "Wish",
      "bloom-garden": "Bloom",
      "confetti-atelier": "Celebrate",
      "sakura-mail": "Sakura",
      "teddy-birthday": "Birthday",
      "atelier-tea": "Tea Time",
    }[slug], 384, 397);
  }
  ctx.shadowColor = "transparent";
  ctx.font = '19px "Inter", Arial, sans-serif';
  ctx.fillStyle = palette.ink;
  spacedText(ctx, {
    "candlelight-cake": "MAKE A LITTLE WISH",
    "starry-wish": "UNDER THE SAME SKY",
    "bloom-garden": "GROW WITH LOVE",
    "confetti-atelier": "A DAY THAT IS YOURS",
    "sakura-mail": "BLOOMING SOFTLY WITH LOVE",
    "teddy-birthday": "WARM HUGS & SWEET WISHES",
    "atelier-tea": "A WARM CUP FOR YOUR NEW YEAR",
  }[slug], 384, 869, 4.8);
  ctx.restore();
}

function cake(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const icing = gradient(ctx, 255, 571, 541, 697, [[0,"#d28b80"],[.17,"#f6c3a7"],[.43,"#fff0d4"],[.68,"#f4b69c"],[1,"#bf7069"]]);
  const cream = gradient(ctx, 317, 564, 380, 681, [[0,"#fff5dc"],[.29,"#ffebd1"],[.73,"#f4cbb0"],[1,"#d99584"]]);
  const platter = gradient(ctx, 371, 752, 427, 798, [[0,"#9b6548"],[.26,"#dbaa6e"],[.51,"#fae4b3"],[.68,"#b68a61"],[1,"#8e6144"]]);
  ctx.shadowColor = "#763d352e";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 17;
  ellipse(ctx, 384, 753, 186, 32, "#c89166");
  ctx.shadowColor = "transparent";
  drawPath(ctx, "M 222 744 C 236 787 531 791 546 744 L 541 759 C 505 807 261 802 227 760Z", platter, "#ad7a54", 2);
  ellipse(ctx, 384, 741, 171, 36, gradient(ctx, 260, 724, 462, 767, [[0,"#cf9d6b"],[.5,"#ffe8bc"],[1,"#be8b60"]]), "#a87853", 1.9);
  ellipse(ctx, 384, 740, 160, 29, undefined, "#fce7b2", 2.6);
  drawPath(ctx, "M 243 616 C 257 575 505 577 526 617 L 526 710 C 525 770 244 766 243 710Z", icing, "#aa605b", 1.6);
  drawPath(ctx, "M 244 689 C 288 721 456 735 525 693 L 525 709 C 501 749 280 747 244 714Z", "#c77d74");
  drawPath(ctx, "M 246 710 C 306 753 476 747 523 710 M 247 721 C 303 759 479 756 519 720", undefined, "#fff0cd", 6);
  drawPath(ctx, "M 244 618 C 256 570 513 581 525 617 L 525 646 C 517 658 511 646 503 647 C 493 651 498 677 485 678 C 468 676 475 654 462 652 C 444 652 449 686 435 686 C 422 685 428 665 413 663 C 394 659 400 694 382 694 C 361 690 373 663 351 660 C 334 657 340 679 324 676 C 307 673 316 653 297 651 C 277 648 282 667 271 663 C 263 661 266 641 251 641 L 244 638Z", cream, "#d59581", 1.8);
  ellipse(ctx, 384, 612, 138, 39, cream, "#d9a38a", 2.5);
  ellipse(ctx, 384, 611, 112, 25, undefined, "#fff9e8", 2.2);
  const random = randomFrom(7613);
  for (let i = 0; i < 110; i++) {
    const x = 253 + random() * 260;
    const y = 698 + random() * 44;
    if (y > 746 - .0014 * (x - 384) ** 2) continue;
    ellipse(ctx, x, y, .8 + random() * 1.1, .8, i % 3 ? "#ffe4b3a1" : "#a96c5f88");
  }
  for (const [x, y, size, rotation] of [[270,609,35,-.6],[300,595,41,-.21],[333,602,36,.28],[433,602,37,-.3],[465,596,42,.36],[500,608,36,.55],[319,630,28,-.35],[448,629,26,.29]]) strawberry(ctx, x, y, size, rotation);
  for (const [x, y] of [[292,622],[346,621],[423,621],[477,621],[262,622],[499,621]]) ellipse(ctx, x, y, 5.8, 3.2, "#fff1d6", "#d6aa81", .6);

  for (const [x, y, sway, tall] of [[342,601,-.14,75], [384,608,.035,111], [422,601,.145,78]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    ctx.fillStyle = gradient(ctx, -7, 0, 9, 3, [[0,"#a9504e"],[.36,"#e08d79"],[.59,"#ffe4ae"],[.79,"#ce7460"],[1,"#9e4d4d"]]);
    ctx.beginPath();
    ctx.roundRect(-6, -tall, 12, tall, 4);
    ctx.fill();
    for (let offset = -tall + 11; offset < -3; offset += 15) drawPath(ctx, `M -5 ${offset + 5} L 5 ${offset - 3}`, undefined, "#fde5b1", 2.6);
    drawPath(ctx, `M 0 ${-tall + 3} L 1 ${-tall - 10}`, undefined, "#5e4937", 2.1);
    const halo = ctx.createRadialGradient(0, -tall - 23, 2, 0, -tall - 23, 43);
    halo.addColorStop(0, "#ffbe5e78");
    halo.addColorStop(1, "#ffce8700");
    ellipse(ctx, 0, -tall - 23, 42, 42, halo);
    const flame = gradient(ctx, 3, -tall - 45, 0, -tall - 9, [[0,"#f1aa55"],[.55,"#ffda86"],[1,"#fff4c9"]]);
    drawPath(ctx, `M 0 ${-tall - 9} C -13 ${-tall - 12} -8 ${-tall - 30} 4 ${-tall - 41} C 1 ${-tall - 28} 15 ${-tall - 15} 0 ${-tall - 9}Z`, flame, "#da9257", .9);
    ctx.restore();
  }
  bow(ctx, 384, 719, 70, "#b96a63", "#ffd8ae", "#803940");
  ctx.restore();
}

function moon(ctx: CanvasRenderingContext2D) {
  const glow = ctx.createRadialGradient(384, 570, 46, 384, 570, 251);
  glow.addColorStop(0, "#dae2f46e");
  glow.addColorStop(.43, "#a8a9bf39");
  glow.addColorStop(1, "#8f94a900");
  ellipse(ctx, 384, 570, 252, 252, glow);
  ctx.save();
  ctx.translate(380, 569);
  ctx.rotate(-.36);
  const crescent = new Path2D("M 27 -132 C -57 -143 -122 -87 -127 -10 C -135 88 -55 146 23 134 C 77 126 118 89 134 41 C 55 103 -27 58 -43 -10 C -60 -75 -13 -119 27 -132Z");
  const lunarGold = gradient(ctx, -135, -126, 104, 123, [[0,"#9c673d"],[.23,"#d7a976"],[.49,"#ffe9af"],[.63,"#ddab74"],[.83,"#f7d599"],[1,"#98683e"]]);
  ctx.shadowColor = "#16152889";
  ctx.shadowBlur = 23;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = lunarGold;
  ctx.fill(crescent);
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#f2d6a1";
  ctx.lineWidth = 1.6;
  ctx.stroke(crescent);
  ctx.save();
  ctx.clip(crescent);
  const random = randomFrom(248);
  for (let i = 0; i < 3700; i++) {
    ctx.globalAlpha = .08 + random() * .38;
    const sx = random() * 289 - 145;
    const sy = random() * 287 - 145;
    const radius = .25 + random() * 1.55;
    ellipse(ctx, sx, sy, radius, radius * .63, i % 3 ? "#fff5cb" : "#775443", undefined, 0, -.4);
  }
  ctx.globalAlpha = .38;
  for (const [x, y, size] of [[-96,-49,16],[-100,31,15],[-49,98,23],[-62,69,16],[24,113,13],[-81,-95,11],[-66,3,9]]) {
    ellipse(ctx, x, y, size, size * .89, undefined, "#99673f", 1.4, -.7);
    ellipse(ctx, x + 2, y + 2, size * .81, size * .72, undefined, "#ffeab5", 1.7, -.7);
  }
  ctx.restore();
  ctx.restore();
  for (const [x, y, size] of [[472, 471, 38],[475,523,20],[520,474,12],[304,474,9],[545,663,17],[254,709,15]]) {
    star(ctx, x, y, size, gold(ctx, y - size, y + size, true), 4, .72);
  }
  drawPath(ctx, "M 213 708 C 337 663 412 591 575 548 M 328 753 C 419 736 526 684 582 628 M 219 567 C 254 531 267 525 299 507", undefined, "#ebc68679", 1.12);
  star(ctx, 575, 548, 11, "#ffe3a5", 4);
  star(ctx, 582, 628, 8, "#ffd699", 4);
}

function flowerRing(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(384, 611);
  ctx.lineCap = "round";
  ellipse(ctx, 0, 0, 151, 151, undefined, "#789271", 3);
  ellipse(ctx, 0, 0, 161, 156, undefined, "#a69a74", 1.4, -.16);
  const random = randomFrom(94809);
  for (let index = 0; index < 49; index++) {
    const angle = index * .127;
    const reach = 138 + random() * 33;
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach;
    const a = angle + Math.PI / 3 + (index % 2 ? .65 : -.65);
    const size = 22 + random() * 26;
    leaf(ctx, x, y, size, a, index % 3 ? "#789474" : "#8c9580", "#d1d5a3", "#557057");
  }
  const blossoms = [[-129,-67,64],[-142,-23,49],[-116,84,69],[-83,119,49],[102,-108,67],[140,-61,49],[140,27,63],[127,77,47],[67,135,54],[-57,-126,49],[2,-147,46]];
  for (const [index, [x, y, size]] of blossoms.entries()) {
    blossom(ctx, x, y, size, 84 + index * 56, index % 3 === 1 ? "#fff0d4" : "#f6c8c4", index % 3 === 1 ? "#d9a77c" : "#ce8c89", index % 3 === 1 ? "#9a655a" : "#965a65");
  }
  for (let index = 0; index < 34; index++) {
    const angle = random() * 2 * Math.PI;
    const reach = 139 + random() * 43;
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach;
    ellipse(ctx, x, y, 3.4, 3.1, index % 3 === 0 ? "#ba7378" : "#f9e7bf", "#a78a65", .6);
  }
  ctx.save();
  ctx.rotate(-.11);
  ctx.shadowColor = "#714c4c52";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 11;
  drawPath(ctx, "M -84 -43 H 84 V 54 H -84Z", "#f0d7af", "#ac845d", 1.3);
  ctx.shadowColor = "transparent";
  drawPath(ctx, "M -83 52 L -3 -6 L 83 52 M -83 -43 L -1 21 L 83 -43Z", "#f7e6c9", "#b38c62", 1.45);
  ellipse(ctx, 0, 18, 23, 21, gradient(ctx, -20, 0, 20, 38, [[0,"#e09786"],[.43,"#a95b5f"],[1,"#773d48"]]), "#9e5660", 1.1);
  ellipse(ctx, 0, 18, 18.5, 17.5, undefined, "#f4b293", 1.2);
  star(ctx, 0, 18, 12, "#eab090", 4, .81);
  ctx.restore();
  bow(ctx, 0, 149, 95, "#c58d8c", "#ffe7c9", "#8a5158");
  ctx.restore();
}

function party(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineCap = "round";
  drawPath(ctx, "M 130 413 Q 384 528 639 416", undefined, "#f7d2a1", 2.2);
  const flags = ["#e2af82", "#d2bd98", "#bd7d76", "#e1b388", "#a9a187"];
  for (let index = 0; index < 11; index++) {
    const x = 136 + index * 44;
    const y = 414 + 61 * Math.sin(index * .295);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(.32 * Math.cos(index * .3));
    drawPath(ctx, "M 0 0 L 31 0 L 17 37Z", flags[index % flags.length], "#f3c997", 1.6);
    drawPath(ctx, "M 3 3 L 17 31 L 28 3", undefined, "#fff0beac", 1.35);
    ctx.restore();
  }
  balloon(ctx, 262, 573, 106, -.26, "#d9968b", "#8a485d");
  balloon(ctx, 325, 553, 88, .02, "#dfb97d", "#9f6455");
  balloon(ctx, 526, 554, 101, .28, "#ad9c83", "#736c68");
  balloon(ctx, 470, 580, 85, -.15, "#dfad9d", "#995966");
  const shadow = ctx.createRadialGradient(388, 787, 4, 388, 787, 189);
  shadow.addColorStop(0, "#3917258e");
  shadow.addColorStop(1, "#39172500");
  ellipse(ctx, 388, 787, 181, 26, shadow);
  gift(ctx, 374, 701, 150, 124, "#bc8a75", "#734757", "#c39c68");
  gift(ctx, 464, 741, 96, 125, "#d89189", "#934e60", "#e2b280");
  gift(ctx, 291, 747, 88, 94, "#adad91", "#696f63", "#d9ae7d");
  const random = randomFrom(119548);
  for (let index = 0; index < 33; index++) {
    const x = 159 + random() * 451;
    const y = 502 + random() * 319;
    if (x > 240 && x < 531 && y > 630) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random() * Math.PI);
    drawPath(ctx, "M -3 3 Q -2 -4 5 -4", undefined, flags[index % flags.length], 2.6);
    ctx.restore();
  }
  ctx.restore();
}

export function coverIllustration(ctx: CanvasRenderingContext2D, slug: TemplateSlug) {
  title(ctx, slug);
  const illustrations: Record<TemplateSlug, (context: CanvasRenderingContext2D) => void> = {
    "candlelight-cake": cake,
    "starry-wish": moon,
    "bloom-garden": flowerRing,
    "confetti-atelier": party,
    "sakura-mail": flowerRing,
    "teddy-birthday": cake,
    "atelier-tea": flowerRing,
  };
  illustrations[slug](ctx);
}
