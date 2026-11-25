export const TEMPLATES = [
  { slug: "candlelight-cake", name: "烛光蛋糕", english: "Candlelight Cake", color: "#f4e6d3", ink: "#6b3d3b", accent: "#b78b51", description: "香草奶油、草莓和一点烛光。" },
  { slug: "starry-wish", name: "星月许愿", english: "Starry Wish", color: "#192644", ink: "#e4c997", accent: "#d7b777", description: "把愿望托付给一弯金色的月亮。" },
  { slug: "bloom-garden", name: "花束花园", english: "Bloom Garden", color: "#e9d8d5", ink: "#6d7051", accent: "#a8935e", description: "一束复古花园里刚摘下的花。" },
  { slug: "confetti-atelier", name: "礼盒派对", english: "Confetti Atelier", color: "#713244", ink: "#f3d7a7", accent: "#d2a36d", description: "丝带、礼盒和热闹的一声惊喜。" },
] as const;

export type TemplateSlug = typeof TEMPLATES[number]["slug"];

export function isTemplateSlug(value: unknown): value is TemplateSlug {
  return TEMPLATES.some(({ slug }) => slug === value);
}

export const PAPER_OPTIONS = [
  { id: "watercolor", label: "冷压水彩纸", description: "细密纤维，温润哑光", color: "#f5ead9" },
  { id: "kraft", label: "复古牛皮纸", description: "暖褐色调，自然粗纹", color: "#bc8c5a" },
  { id: "pearl", label: "星闪珠光卡纸", description: "细闪珠光，柔和反射", color: "#eae0e5" },
] as const;

export const FONT_OPTIONS = [
  { id: "long-cang", label: "中文手写", family: "Long Cang" },
  { id: "caveat", label: "英文手写", family: "Caveat" },
  { id: "serif", label: "典雅宋体", family: "Noto Serif SC" },
] as const;

export const INK_OPTIONS = [
  { id: "sepia", label: "典雅咖棕", color: "#584033", kraftColor: "#4a3329" },
  { id: "berry", label: "酒红莓果", color: "#7c3045", kraftColor: "#632234" },
  { id: "indigo", label: "午夜黛蓝", color: "#2d426a", kraftColor: "#243554" },
  { id: "pine", label: "松林墨绿", color: "#2f5447", kraftColor: "#254238" },
] as const;

export type InkId = typeof INK_OPTIONS[number]["id"];

export function isInkId(value: unknown): value is InkId {
  return INK_OPTIONS.some(({ id }) => id === value);
}

export const STICKERS = [
  { id: "cake", label: "生日蛋糕", symbol: "🎂" },
  { id: "candle", label: "蜡烛", symbol: "🕯️" },
  { id: "balloon", label: "气球", symbol: "🎈" },
  { id: "crown", label: "小皇冠", symbol: "👑" },
  { id: "gift", label: "礼盒", symbol: "🎁" },
  { id: "champagne", label: "香槟杯", symbol: "🥂" },
  { id: "bow", label: "蝴蝶结", symbol: "🎀" },
  { id: "star", label: "闪星", symbol: "✦" },
  { id: "confetti", label: "彩带", symbol: "🎉" },
  { id: "bouquet", label: "花束", symbol: "💐" },
  { id: "bottle", label: "许愿瓶", symbol: "🪄" },
  { id: "hat", label: "派对帽", symbol: "🥳" },
] as const;

export const WAX_OPTIONS = [
  { id: "rose", label: "酒红玫瑰", color: "#9f354d", stamp: "#c67185", emissive: "#5e1629", glyph: "✿" },
  { id: "gold", label: "鎏金星月", color: "#b68534", stamp: "#ecd08b", emissive: "#614111", glyph: "✦" },
  { id: "sage", label: "松绿橄榄", color: "#3d6353", stamp: "#7ea892", emissive: "#1a3328", glyph: "❦" },
  { id: "cream", label: "奶油爱心", color: "#c98582", stamp: "#f3cbc6", emissive: "#6b3838", glyph: "♥" },
] as const;

export type WaxId = typeof WAX_OPTIONS[number]["id"];

export function isWaxId(value: unknown): value is WaxId {
  return WAX_OPTIONS.some(({ id }) => id === value);
}

export const WISH_GROUPS = [
  {
    label: "挚友闺蜜",
    items: [
      "生日快乐！愿你新的一岁被温柔与惊喜环绕，永远闪闪发光。",
      "祝我最好的朋友生日快乐！新的一岁，愿你自由热烈，所遇皆良人。",
      "又长大一岁啦，希望你永远保留这份可爱与赤诚，平安喜乐，万事顺遂。",
    ],
  },
  {
    label: "恋人爱人",
    items: [
      "生日快乐，我的心上人。往后的每一个生日，我都想陪你一起吹蜡烛。",
      "谢谢你出现在我的世界里，愿这一岁所有的星光和偏爱都奔向你。",
      "Happy Birthday! 愿所有心愿如期而至，而我永远在你身边。",
    ],
  },
  {
    label: "家人长辈",
    items: [
      "祝您生日快乐，身体健康，岁岁常欢愉，万事皆胜意。",
      "愿时光慢一点，愿您天天开心顺心，平安健康常伴左右。",
      "感谢一路的陪伴与照顾，祝新的一岁福寿安康，笑口常开。",
    ],
  },
  {
    label: "优雅通用",
    items: [
      "岁岁常欢愉，万事皆胜意。",
      "Happy Birthday! 愿你眼中有光，心中有爱，步履所至皆是风景。",
      "愿新的一岁，所有美好都如约而至，所行皆坦途。",
    ],
  },
] as const;

export const WISHES = WISH_GROUPS.flatMap((group) => group.items);

export type PaperId = typeof PAPER_OPTIONS[number]["id"];
export type FontId = typeof FONT_OPTIONS[number]["id"];
export type StickerId = typeof STICKERS[number]["id"];

export interface Sticker {
  id: string;
  type: StickerId;
  x: number;
  y: number;
  scale: number;
  rotation?: number;
}

export type Music =
  | { kind: "none" }
  | { kind: "music-box" }
  | { kind: "upload"; name: string; data: string };

export interface CardDraft {
  template: TemplateSlug;
  paper: PaperId;
  recipient: string;
  message: string;
  sender: string;
  font: FontId;
  ink?: InkId;
  stickers: Sticker[];
  birthday: string;
  music: Music;
  wax?: WaxId;
  motto?: string;
}

export function defaultDraft(template: TemplateSlug = TEMPLATES[0].slug): CardDraft {
  return {
    template,
    paper: "watercolor",
    recipient: "",
    message: "",
    sender: "",
    font: "serif",
    ink: "sepia",
    stickers: [],
    birthday: "",
    music: { kind: "music-box" },
    wax: "rose",
    motto: "",
  };
}

export interface StudioInspiration {
  name: string;
  template: TemplateSlug;
  paper: PaperId;
  font: FontId;
  ink: InkId;
  wax: WaxId;
  motto: string;
  message: string;
  stickers: { type: StickerId; x: number; y: number; scale: number; rotation: number }[];
}

export const STUDIO_INSPIRATIONS: readonly StudioInspiration[] = [
  {
    name: "奶油烛光手账",
    template: "candlelight-cake",
    paper: "watercolor",
    font: "long-cang",
    ink: "berry",
    wax: "rose",
    motto: "愿这一岁的每一天都甜丝丝的",
    message: "生日快乐！愿你新的一岁被温柔与惊喜环绕，永远闪闪发光。",
    stickers: [
      { type: "cake", x: .24, y: .78, scale: .92, rotation: -7 },
      { type: "star", x: .79, y: .27, scale: .78, rotation: 10 },
    ],
  },
  {
    name: "午夜星河许愿",
    template: "starry-wish",
    paper: "pearl",
    font: "serif",
    ink: "indigo",
    wax: "gold",
    motto: "All your wishes, safely kept",
    message: "谢谢你出现在我的世界里，愿这一岁所有的星光和偏爱都奔向你。",
    stickers: [
      { type: "bottle", x: .23, y: .77, scale: .9, rotation: -6 },
      { type: "crown", x: .77, y: .26, scale: .82, rotation: 9 },
    ],
  },
  {
    name: "复古花园信笺",
    template: "bloom-garden",
    paper: "kraft",
    font: "serif",
    ink: "pine",
    wax: "sage",
    motto: "愿你如花般自由盛放",
    message: "又长大一岁啦，希望你永远保留这份可爱与赤诚，平安喜乐，万事顺遂。",
    stickers: [
      { type: "bouquet", x: .24, y: .77, scale: .95, rotation: -8 },
      { type: "bow", x: .78, y: .28, scale: .8, rotation: 8 },
    ],
  },
  {
    name: "香槟礼花派对",
    template: "confetti-atelier",
    paper: "pearl",
    font: "long-cang",
    ink: "berry",
    wax: "cream",
    motto: "Cheers to another wonderful year",
    message: "Happy Birthday! 愿你眼中有光，心中有爱，步履所至皆是风景。",
    stickers: [
      { type: "champagne", x: .24, y: .77, scale: .92, rotation: -6 },
      { type: "balloon", x: .79, y: .28, scale: .88, rotation: 7 },
    ],
  },
];

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const OUTBOX_KEY = "birthday-cards:outbox";
export const OUTBOX_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,96}$/;
