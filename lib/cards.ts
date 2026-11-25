export const TEMPLATES = [
  { slug: "candlelight-cake", name: "烛光蛋糕", english: "Candlelight Cake", color: "#f4e6d3", ink: "#6b3d3b", accent: "#b78b51", description: "香草奶油、草莓和一点烛光。" },
  { slug: "starry-wish", name: "星月许愿", english: "Starry Wish", color: "#192644", ink: "#e4c997", accent: "#d7b777", description: "把愿望托付给一弯金色的月亮。" },
  { slug: "bloom-garden", name: "花束花园", english: "Bloom Garden", color: "#e9d8d5", ink: "#6d7051", accent: "#a8935e", description: "一束复古花园里刚摘下的花。" },
  { slug: "confetti-atelier", name: "礼盒派对", english: "Confetti Atelier", color: "#713244", ink: "#f3d7a7", accent: "#d2a36d", description: "丝带、礼盒和热闹的一声惊喜。" },
  { slug: "sakura-mail", name: "樱花来信", english: "Sakura Post", color: "#e8c8cc", ink: "#7c3f4d", accent: "#c5985c", description: "粉樱垂枝、丝带情书与金色蝴蝶。" },
  { slug: "teddy-birthday", name: "奶油小熊", english: "Teddy's Birthday", color: "#e2c6a6", ink: "#6d4531", accent: "#c29252", description: "戴着派对帽的小熊、草莓杯糕与暖金气球。" },
  { slug: "atelier-tea", name: "森系茶会", english: "Atelier Tea Party", color: "#cfd9c5", ink: "#51604a", accent: "#b29456", description: "骨瓷花茶、马卡龙与仙女棒莓果塔。" },
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

export const MUSIC_PRESETS = [
  { id: "music-box", label: "八音盒 · 生日快乐", description: "经典温暖庆生旋律，零流量直放" },
  { id: "starry-lullaby", label: "八音盒 · 晚安星河", description: "轻柔星光摇篮曲，适合星月与温柔祝福" },
  { id: "canon-breeze", label: "八音盒 · 浪漫卡农", description: "优雅清透卡农变奏，复古花园与恋人绝配" },
] as const;

export type BuiltinMusicKind = typeof MUSIC_PRESETS[number]["id"];

export type Music =
  | { kind: "none" }
  | { kind: "music-box" }
  | { kind: "starry-lullaby" }
  | { kind: "canon-breeze" }
  | { kind: "custom-notes"; notes: string }
  | { kind: "url"; url: string; name?: string }
  | { kind: "upload"; name: string; data: string };

export const CUSTOM_NOTE_SAMPLES = [
  { label: "小星星", notes: "1 1 5 5 6 6 5 - 4 4 3 3 2 2 1 -" },
  { label: "生日快乐", notes: "5 5 6 5 1' 7 - 5 5 6 5 2' 1' -" },
  { label: "卡农片段", notes: "3' 2' 1' 7 6 5 6 7 1' 7 6 5" },
] as const;

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
  {
    name: "春樱飞书笺",
    template: "sakura-mail",
    paper: "pearl",
    font: "serif",
    ink: "berry",
    wax: "cream",
    motto: "愿春风与花瓣把偏爱送到你身旁",
    message: "生日快乐！愿你新的一岁如春樱般温柔明媚，所遇皆欢喜。",
    stickers: [
      { type: "bow", x: .24, y: .78, scale: .88, rotation: -8 },
      { type: "bouquet", x: .78, y: .28, scale: .84, rotation: 9 },
    ],
  },
  {
    name: "暖烘烘小熊派对",
    template: "teddy-birthday",
    paper: "watercolor",
    font: "long-cang",
    ink: "sepia",
    wax: "gold",
    motto: "Warm hugs & sweetest wishes",
    message: "又长大一岁啦！愿你永远被软乎乎的拥抱和甜滋滋的小确幸包围。",
    stickers: [
      { type: "hat", x: .24, y: .77, scale: .9, rotation: -6 },
      { type: "cake", x: .78, y: .28, scale: .85, rotation: 8 },
    ],
  },
  {
    name: "午后森系茶话会",
    template: "atelier-tea",
    paper: "kraft",
    font: "serif",
    ink: "pine",
    wax: "sage",
    motto: "A warm cup for your new year",
    message: "愿新的一岁不慌不忙，有好茶、有甜点，也有一直陪在身旁的人。",
    stickers: [
      { type: "gift", x: .24, y: .78, scale: .88, rotation: -7 },
      { type: "star", x: .79, y: .26, scale: .78, rotation: 11 },
    ],
  },
];

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const OUTBOX_KEY = "birthday-cards:outbox";
export const OUTBOX_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,96}$/;
