import type { StickerId } from "./cards";
import { balloon, blossom, bow, drawPath, ellipse, gift, gold, gradient, leaf, star, strawberry, surface } from "./art-ornaments";

export const STICKER_BASE_SIZE = .178;
const cache = new Map<StickerId, HTMLCanvasElement>();

type StickerDrawing = (ctx: CanvasRenderingContext2D) => void;

const drawSticker: Record<StickerId, StickerDrawing> = {
  cake(ctx) {
    ellipse(ctx, 100, 152, 71, 16, "#e3b88d", "#af765e", 2);
    drawPath(ctx, "M 38 97 H 161 V 143 C 148 168 54 168 38 142Z", gradient(ctx, 40, 112, 154, 146, [[0,"#d38c85"],[.45,"#f3bdad"],[1,"#c27775"]]), "#af615d", 1.5);
    drawPath(ctx, "M 42 142 C 59 159 135 160 157 143", undefined, "#ffe8c9", 3);
    drawPath(ctx, "M 40 98 H 159 V 112 Q 153 118 146 113 Q 142 111 139 121 Q 135 133 127 123 Q 124 117 117 117 Q 110 116 107 126 Q 103 136 94 127 Q 91 118 84 118 Q 78 117 73 126 Q 67 132 65 124 Q 64 117 55 118 Q 54 126 49 123 Q 42 121 40 112Z", "#fff1d5", "#e6a780", 1.3);
    ellipse(ctx, 100, 97, 61, 18, "#fff1d5", "#ddaa91", 1.5);
    for (const [x, y, r] of [[58,96,-.42],[75,88,-.24],[124,89,.23],[143,96,.38]]) strawberry(ctx, x, y, 21, r);
    ctx.save();
    ctx.translate(100, 54);
    ctx.scale(.51, .51);
    ctx.translate(-100, -86);
    drawSticker.candle(ctx);
    ctx.restore();
    bow(ctx, 100, 142, 33, "#c77172", "#ffd39e", "#91464b");
  },
  candle(ctx) {
    const wax = gradient(ctx, 81, 69, 117, 149, [[0,"#aa5d63"],[.5,"#e0a095"],[.73,"#ffddab"],[1,"#ae6763"]]);
    drawPath(ctx, "M 86 71 Q 100 65 114 71 V 152 Q 100 166 86 152 Z", wax, "#b56e66", 2.3);
    for (let y = 83; y < 152; y += 17) drawPath(ctx, `M 87 ${y + 7} L 113 ${y - 3}`, undefined, "#ffe7b9", 4);
    drawPath(ctx, "M 100 73 L 101 57", undefined, "#6e493b", 2.5);
    const flame = gradient(ctx, 104, 23, 98, 61, [[0,"#e9a653"],[.55,"#ffd080"],[1,"#fff3c0"]]);
    drawPath(ctx, "M 103 60 C 77 56 91 36 107 24 C 101 37 122 49 103 60Z", flame, "#d28a5b", 1.5);
    star(ctx, 61, 47, 12, "#cc9559", 4);
    star(ctx, 140, 42, 9, "#c88c52", 4);
  },
  balloon(ctx) {
    balloon(ctx, 101, 72, 74, -.16, "#ce8b8d", "#924859");
    balloon(ctx, 124, 86, 62, .18, "#d9ae75", "#9c6558");
    bow(ctx, 106, 149, 31, "#b97580", "#f7cfac", "#8c5266");
    star(ctx, 56, 36, 9, "#cb9e5d", 4);
  },
  crown(ctx) {
    const metal = gradient(ctx, 56, 50, 143, 138, [[0,"#b27b51"],[.43,"#fce1a6"],[.7,"#d4a468"],[1,"#a67453"]]);
    drawPath(ctx, "M 40 69 L 74 96 L 100 43 L 126 96 L 160 69 L 146 139 Q 99 150 54 139Z", metal, "#a77654", 3);
    drawPath(ctx, "M 51 123 Q 100 134 149 123 M 44 81 L 76 106 L 100 60 L 124 106 L 156 81", undefined, "#fff1c6", 2);
    for (const [x, y] of [[40,69],[100,41],[160,69]]) ellipse(ctx, x, y, 5, 5, "#ebba7d", "#a57650", 1.4);
    for (const [x, y] of [[77,117],[100,109],[122,117]]) star(ctx, x, y, x === 100 ? 8 : 5, "#bb6878", 4, .8);
  },
  gift(ctx) {
    gift(ctx, 100, 108, 111, 105, "#c68a88", "#8c4a60", "#d3a465");
    star(ctx, 151, 40, 10, "#d0a363", 4);
    star(ctx, 46, 60, 7, "#d0a363", 4);
  },
  champagne(ctx) {
    for (const [x, rotation] of [[67,-.29],[134,.29]]) {
      ctx.save();
      ctx.translate(x, 89);
      ctx.rotate(rotation);
      drawPath(ctx, "M -17 -39 H 17 Q 23 3 3 18 V 56 H 21 V 59 H -21 V 56 H -3 V 18 Q -23 3 -17 -39Z", "#f7e7c8", "#b78a58", 2);
      drawPath(ctx, "M -16 -13 Q -3 -21 16 -14 Q 15 11 0 14 Q -16 10 -16 -13Z", "#d7a66a", "#b78a58", 1.2);
      for (const [bx, by, size] of [[-6,7,2],[5,1,1.6],[-3,-8,2],[5,-13,1.7],[0,-28,1.2]]) ellipse(ctx, bx, by, size, size, "#fff3ce");
      ctx.restore();
    }
    star(ctx, 102, 45, 13, "#d39b5e", 4);
    star(ctx, 107, 25, 7, "#c28c51", 4);
  },
  bow(ctx) {
    bow(ctx, 99, 86, 113, "#bd758e", "#fcd4bb", "#854663");
    star(ctx, 53, 121, 9, "#cf9b67", 4);
    star(ctx, 152, 123, 7, "#cf9b67", 4);
  },
  star(ctx) {
    star(ctx, 100, 99, 66, "#e7c694", 4, .89);
    star(ctx, 100, 99, 59, gold(ctx, 37, 163), 4, .91);
    star(ctx, 101, 99, 43, "#f9deb0", 4, .85);
    star(ctx, 43, 57, 17, "#d5a16b", 4, .8);
    star(ctx, 155, 62, 12, "#d1a26c", 4, .85);
    star(ctx, 145, 141, 12, "#c98d61", 4, .83);
  },
  confetti(ctx) {
    drawPath(ctx, "M 52 158 L 77 70 Q 120 83 132 111 Z", gradient(ctx, 49, 155, 132, 90, [[0,"#a7656c"],[.61,"#ce8b91"],[1,"#f3caa4"]]), "#ad706c", 3);
    drawPath(ctx, "M 61 132 L 80 140 M 68 113 L 103 126 M 74 95 L 122 113", undefined, "#ffdbb3", 3.3);
    const serpentine: [string, string][] = [
      ["M 99 86 Q 77 61 100 52 Q 126 43 112 27", "#bf6f7c"],
      ["M 125 99 Q 132 73 152 77 Q 169 81 165 60", "#7d9e88"],
      ["M 117 78 Q 126 50 143 47", "#bb9066"],
    ];
    for (const [path, color] of serpentine) drawPath(ctx, path, undefined, color, 4);
    for (const [x, y, size] of [[74,40,12],[143,62,9],[140,27,10],[165,100,10]]) star(ctx, x, y, size, "#d5a86d", 4);
  },
  bouquet(ctx) {
    for (const [x, y] of [[69,70],[110,43],[131,75],[88,89]]) drawPath(ctx, `M 101 153 Q 99 121 ${x} ${y}`, undefined, "#687d62", 2.7);
    for (const [x, y, size, angle] of [[78,92,42,.53],[113,99,37,-.51],[65,81,34,.35],[134,96,43,-.55],[87,110,36,.71]]) leaf(ctx, x, y, size, angle);
    blossom(ctx, 68, 68, 52, 13);
    blossom(ctx, 103, 51, 58, 14, "#ffedc7", "#d9a77e", "#9f6656");
    blossom(ctx, 131, 80, 48, 44);
    drawPath(ctx, "M 62 94 L 102 119 L 141 94 L 119 161 Q 97 174 76 160Z", gradient(ctx, 65, 94, 136, 159, [[0,"#f6d6ae"],[1,"#c99678"]]), "#be8768", 1.5);
    drawPath(ctx, "M 76 159 L 110 122 L 140 95", undefined, "#ffedd0", 2);
    bow(ctx, 99, 141, 45, "#ba7385", "#fae0bc", "#8b526e");
  },
  bottle(ctx) {
    const glass = gradient(ctx, 64, 96, 130, 141, [[0,"#a9b19b"],[.41,"#e6e0bd"],[.57,"#f4e5bc"],[1,"#969780"]]);
    drawPath(ctx, "M 81 50 H 119 V 75 Q 135 85 137 103 V 147 Q 136 162 121 164 H 79 Q 64 163 63 147 V 103 Q 64 85 81 75Z", glass, "#8c9479", 2.1);
    drawPath(ctx, "M 72 103 Q 99 95 128 103 L 129 145 Q 127 153 121 154 H 78 Q 72 153 71 146Z", "#cbad86", "#c19d76", 1.7);
    drawPath(ctx, "M 82 57 L 79 34 Q 101 29 121 34 L 118 57Z", "#a67855", "#8c674f", 1.75);
    drawPath(ctx, "M 87 69 H 112 M 87 38 L 87 50 M 95 35 L 95 51 M 105 35 L 105 51 M 113 37 L 113 51", undefined, "#f2c392", 1.6);
    for (const [x, y, size] of [[99,122,18],[79,133,8],[119,139,8],[113,107,7],[147,75,9],[54,63,12]]) star(ctx, x, y, size, "#f3d7a2", 4, .81);
  },
  hat(ctx) {
    const color = gradient(ctx, 47, 89, 153, 144, [[0,"#a96b80"],[.52,"#d6a19d"],[1,"#8e586d"]]);
    drawPath(ctx, "M 100 36 L 158 143 Q 153 160 100 160 Q 48 160 42 143Z", color, "#9d5f70", 2.3);
    drawPath(ctx, "M 48 132 Q 97 152 153 132 L 158 143 Q 151 159 100 160 Q 50 160 42 143Z", "#e1b889", "#b78269", 2.2);
    for (const [x, y, size] of [[100,65,7],[94,100,9],[116,93,6],[122,121,9],[75,122,7],[103,124,7]]) star(ctx, x, y, size, "#efd1a4", 4, .78);
    for (let i = 0; i < 11; i++) {
      const angle = i * .571;
      ellipse(ctx, 100 + Math.cos(angle) * 7, 35 + Math.sin(angle) * 7, 6.8, 5.7, i % 2 ? "#f4d6aa" : "#d0a16f", "#af795e", .7);
    }
  },
};

export function stickerArt(type: StickerId): HTMLCanvasElement {
  const previous = cache.get(type);
  if (previous) return previous;
  const { canvas: ink, ctx } = surface(200, 200);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawSticker[type](ctx);

  // Subtle vintage warm watercolor paper wash over the sticker pigment so it blends
  // harmoniously with the bespoke illustrated covers and Option B left frontispiece.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const sheen = ctx.createLinearGradient(24, 18, 176, 184);
  sheen.addColorStop(0, "rgba(255, 250, 238, 0.22)");
  sheen.addColorStop(.52, "rgba(255, 245, 224, 0.04)");
  sheen.addColorStop(1, "rgba(122, 82, 56, 0.14)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 200, 200);
  // Tactile cotton speckle dots inside pigment
  ctx.fillStyle = "rgba(116, 80, 52, 0.06)";
  for (let i = 0; i < 64; i++) {
    const px = ((i * 73 + 19) % 168) + 16;
    const py = ((i * 119 + 37) % 168) + 16;
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.restore();

  // Warm cream cotton-paper die-cut sticker border + hairline antique-gold rim
  const { canvas: outerMask, ctx: outerCtx } = surface(200, 200);
  outerCtx.drawImage(ink, 0, 0);
  outerCtx.globalCompositeOperation = "source-in";
  outerCtx.fillStyle = "#e6cfa9";
  outerCtx.fillRect(0, 0, 200, 200);

  const { canvas: mask, ctx: maskContext } = surface(200, 200);
  maskContext.drawImage(ink, 0, 0);
  maskContext.globalCompositeOperation = "source-in";
  maskContext.fillStyle = "#fff8eb";
  maskContext.fillRect(0, 0, 200, 200);

  const { canvas, ctx: output } = surface(200, 200);
  output.shadowColor = "rgba(86, 56, 38, 0.28)";
  output.shadowBlur = 7;
  output.shadowOffsetX = 1;
  output.shadowOffsetY = 3.5;
  for (let index = 0; index < 16; index++) {
    const angle = index * Math.PI / 8;
    output.drawImage(outerMask, Math.cos(angle) * 6.4, Math.sin(angle) * 6.4);
  }
  output.shadowColor = "transparent";
  for (let index = 0; index < 16; index++) {
    const angle = index * Math.PI / 8;
    output.drawImage(mask, Math.cos(angle) * 5.2, Math.sin(angle) * 5.2);
  }
  output.drawImage(ink, 0, 0);
  cache.set(type, canvas);
  return canvas;
}
