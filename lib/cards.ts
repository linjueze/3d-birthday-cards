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

export const WISHES = [
  "生日快乐，愿你新的一岁被温柔与惊喜环绕。",
  "Happy Birthday! 愿所有心愿如期而至。",
  "岁岁常欢愉，万事皆胜意。",
] as const;

export type PaperId = typeof PAPER_OPTIONS[number]["id"];
export type FontId = typeof FONT_OPTIONS[number]["id"];
export type StickerId = typeof STICKERS[number]["id"];

export interface Sticker {
  id: string;
  type: StickerId;
  x: number;
  y: number;
  scale: number;
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
  stickers: Sticker[];
  birthday: string;
  music: Music;
}

export function defaultDraft(template: TemplateSlug = TEMPLATES[0].slug): CardDraft {
  return { template, paper: "watercolor", recipient: "", message: "", sender: "", font: "serif", stickers: [], birthday: "", music: { kind: "none" } };
}

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const OUTBOX_KEY = "birthday-cards:outbox";
export const OUTBOX_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,96}$/;
