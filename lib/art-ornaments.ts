export const ART_WIDTH = 768;
export const ART_HEIGHT = 1024;

export function surface(width = ART_WIDTH, height = ART_HEIGHT) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  return { canvas, ctx };
}

export function randomFrom(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function gradient(ctx: CanvasRenderingContext2D, x: number, y: number, endX: number, endY: number, stops: [number, string][]) {
  const result = ctx.createLinearGradient(x, y, endX, endY);
  for (const [offset, color] of stops) result.addColorStop(offset, color);
  return result;
}

export function gold(ctx: CanvasRenderingContext2D, y: number, endY = y + 36, dark = false) {
  return gradient(ctx, 0, y, 100, endY, dark
    ? [[0, "#a97742"], [.23, "#d4a76f"], [.49, "#fce6ae"], [.59, "#a47338"], [.78, "#f5d69b"], [1, "#bd8a49"]]
    : [[0, "#a67843"], [.29, "#c59c61"], [.46, "#f6dfa9"], [.56, "#b0874e"], [.86, "#d7b880"], [1, "#a67843"]]);
}

export function drawPath(ctx: CanvasRenderingContext2D, shape: string, fill?: string | CanvasGradient, stroke?: string | CanvasGradient, lineWidth = 1) {
  const path = new Path2D(shape);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke(path);
  }
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill?: string | CanvasGradient, stroke?: string | CanvasGradient, lineWidth = 1, angle = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string | CanvasGradient, rays = 4, orbit = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(orbit, 1);
  ctx.beginPath();
  for (let index = 0; index < rays * 2; index++) {
    const angle = index * Math.PI / rays - Math.PI / 2;
    const point = radius * (index % 2 === 0 ? 1 : .23);
    ctx.lineTo(Math.cos(angle) * point, Math.sin(angle) * point);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function spacedText(ctx: CanvasRenderingContext2D, text: string, middle: number, y: number, spacing: number) {
  const characters = [...text];
  const width = characters.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + (characters.length - 1) * spacing;
  ctx.save();
  ctx.textAlign = "left";
  let left = middle - width / 2;
  for (const char of characters) {
    ctx.fillText(char, left, y);
    left += ctx.measureText(char).width + spacing;
  }
  ctx.restore();
}

export function bow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color = "#c66769", light = "#ffe1bc", dark = "#883747") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const satin = gradient(ctx, -37, -15, 46, 24, [[0, dark], [.36, color], [.46, light], [.57, color], [1, dark]]);
  drawPath(ctx, "M -6 3 C -16 19 -2 29 -26 52 L -42 55 C -18 35 -24 18 -12 3 M 6 2 C 18 17 12 34 43 44 L 27 53 C 8 42 7 23 3 7", satin, dark, .9);
  drawPath(ctx, "M -4 -3 C -20 -11 -39 -31 -56 -20 C -65 -14 -55 12 -49 15 C -36 17 -16 9 -4 4 M 4 -3 C 20 -11 39 -31 56 -20 C 65 -14 55 12 49 15 C 36 17 16 9 4 4", satin, dark, 1.3);
  drawPath(ctx, "M -49 -7 Q -28 -5 -8 1 M 49 -7 Q 28 -5 8 1 M -46 12 Q -29 9 -12 4 M 46 12 Q 29 9 12 4", undefined, light, 1);
  ellipse(ctx, 0, 0, 9, 10, satin, dark, 1.2);
  ctx.restore();
}

export function strawberry(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 50, size / 50);
  ctx.rotate(rotation);
  const fruit = ctx.createRadialGradient(-10, -9, 2, 5, -1, 29);
  fruit.addColorStop(0, "#ffc08f");
  fruit.addColorStop(.28, "#ed8068");
  fruit.addColorStop(.65, "#be4e53");
  fruit.addColorStop(1, "#772132");
  drawPath(ctx, "M 0 -18 C -16 -29 -29 -17 -23 0 C -18 12 -6 25 0 25 C 7 26 20 11 24 0 C 30 -16 18 -26 0 -18 Z", fruit, "#a94a49", .8);
  for (const [sx, sy] of [[-11,-11],[0,-10],[12,-11],[-17,-3],[-6,-2],[5,-2],[16,-3],[-11,6],[0,6],[10,6],[-6,13],[5,13],[0,19]]) {
    ellipse(ctx, sx, sy, 1.3, 2.1, "#f9d498", "#a44342", .5, -.3);
  }
  drawPath(ctx, "M 0 -19 Q -13 -26 -20 -21 Q -11 -15 -5 -17 Q -12 -10 -3 -12 Q 2 -14 4 -19 Q 12 -11 16 -16 L 23 -22 Q 15 -25 6 -21 Q 5 -29 0 -31 L -2 -28 Z", "#788054", "#575b40", .8);
  ctx.restore();
}

export function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, tint = "#729175", light = "#bdc59a", dark = "#48644e") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size / 44, size / 44);
  const color = gradient(ctx, -16, -13, 18, 6, [[0, dark], [.55, tint], [1, light]]);
  drawPath(ctx, "M -22 1 Q -12 -17 20 0 Q 2 20 -22 1Z", color, dark, .6);
  drawPath(ctx, "M -20 1 Q -3 4 19 0 M -11 2 l 8 -7 m 0 7 l 8 5 m -3 -6 l 9 -5", undefined, light, .7);
  ctx.restore();
}

export function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number, pale = "#fde0ce", shade = "#c98584", deep = "#855055") {
  const random = randomFrom(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 70, size / 70);
  const petal = "M 0 5 C -13 0 -18 -26 -9 -36 C 0 -47 16 -37 15 -22 C 14 -8 9 1 0 5 Z";
  for (let ring = 0; ring < 3; ring++) {
    const count = [9, 7, 5][ring];
    const shrink = [1, .7, .46][ring];
    for (let index = 0; index < count; index++) {
      ctx.save();
      ctx.rotate(index * 2 * Math.PI / count + random() * .24 + ring * .6);
      ctx.scale(shrink, shrink);
      const fill = gradient(ctx, 0, -43, 0, 5, [[0, pale], [.34, ring === 1 ? pale : shade], [.76, shade], [1, deep]]);
      drawPath(ctx, petal, fill, ring === 1 ? pale : shade, .8);
      drawPath(ctx, "M 1 2 Q -8 -9 -5 -29 M 2 -1 Q 6 -14 7 -24", undefined, pale, .65);
      ctx.restore();
    }
  }
  ellipse(ctx, 0, 0, 8, 7, "#ba8352");
  for (let index = 0; index < 18; index++) {
    const angle = random() * 2 * Math.PI;
    const radius = random() * 8;
    ellipse(ctx, Math.cos(angle) * radius, Math.sin(angle) * radius, 1.3, 1.5, index % 3 ? "#efd08a" : deep);
  }
  ctx.restore();
}

export function gift(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, width: number, color: string, dark: string, ribbon: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  const half = width / 2;
  const paper = gradient(ctx, -half, -52, half, 49, [[0, dark], [.14, color], [.53, color], [1, dark]]);
  drawPath(ctx, `M ${-half} -34 L ${half} -34 L ${half - 4} 54 Q 0 64 ${-half + 4} 54Z`, paper, dark, 1.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-half + 4, -34, width - 8, 88);
  ctx.clip();
  for (let row = -20; row <= 52; row += 14) {
    for (let column = -half; column <= half; column += 13) {
      star(ctx, column + (row / 14 % 2) * 5, row, 2, "#f6d3ac", 4);
    }
  }
  ctx.restore();
  drawPath(ctx, `M ${-half - 5} -45 Q 0 -51 ${half + 5} -45 L ${half + 5} -24 Q 0 -19 ${-half - 5} -24Z`, paper, dark, 1.6);
  const band = gradient(ctx, -12, 0, 12, 1, [[0, dark], [.33, ribbon], [.66, "#fae3ad"], [1, ribbon]]);
  drawPath(ctx, "M -12 -48 Q 0 -50 12 -48 L 10 57 Q 1 60 -11 57Z", band, ribbon, .8);
  bow(ctx, 0, -49, .37 * width, ribbon, "#fff0c3", dark);
  ctx.restore();
}

export function balloon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, tone: string, shade: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size / 100, size / 100);
  drawPath(ctx, "M 1 38 C 18 62 -12 82 8 129 C 14 143 5 156 -2 164", undefined, "#d3ac73", 1.7);
  const latex = ctx.createRadialGradient(-13, -25, 5, 3, -7, 52);
  latex.addColorStop(0, "#f6dfbd");
  latex.addColorStop(.32, tone);
  latex.addColorStop(1, shade);
  drawPath(ctx, "M -34 -12 C -37 -43 -20 -59 0 -59 C 30 -59 41 -38 35 -12 C 31 13 18 30 0 39 C -20 31 -31 8 -34 -12Z M 0 36 L 7 46 Q 0 44 -7 46Z", latex, shade, 1.2);
  drawPath(ctx, "M -24 -20 Q -24 -44 -7 -45", undefined, "#fbe0b68d", 2.4);
  ctx.restore();
}
