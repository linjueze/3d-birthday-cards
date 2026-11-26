# Birthday Cards · 生日信

> 挑一张立体烫金纸艺贺卡，写下祝福、贴上贴纸、谱一段八音盒旋律，再亲手装进信封盖上火漆，用一条极短的私密链接把心意寄给重要的人。

**在线体验**：https://linjueze.github.io/3d-birthday-cards/

---

## 核心特性

### 1. 七款 3D 烫金立体纸艺封面 & 专属微动效
采用 Three.js 实时渲染立体纸卡折页、多层凹凸浮雕（`base` / `relief` / `foil` / `height` PBR 贴图）与 GLSL 流动烫金扫光，并为每款封面配备专属微动效与左内页透明水彩扉页插画：

| 主题 | 英文名 | 视觉与专属微动效 |
| --- | --- | --- |
| **烛光蛋糕** | Candlelight Cake | 香草草莓奶油蛋糕、三支摇曳烛火与上升金星 |
| **星月许愿** | Starry Wish | 午夜靛蓝星空、金月吊坠轻摆与划过流星 |
| **花束花园** | Bloom Garden | 复古植物花环、飘落玫瑰花瓣与金色花粉微光 |
| **礼盒派对** | Confetti Atelier | 酒红气球礼盒、飘落香槟金彩带与气球高光呼吸 |
| **樱花来信** | Sakura Post | 垂枝粉樱、火漆情书、飘落樱瓣与双蝶金粉微闪 |
| **奶油小熊** | Teddy's Birthday | 派对帽小熊、草莓杯糕烛火摇曳与暖金爱心气球 |
| **森系茶会** | Atelier Tea Party | 骨瓷花茶、马卡龙、仙女棒火花闪烁与袅袅星光热气 |

- 首页支持 **对称 5 卡 3D 扇形展台**、自由拖拽旋转、滚轮/双指缩放细节、手机端陀螺仪微倾视差。
- 内置 0ms 内联缩略图与并行 WebP 渐进加载，首屏无闪烁；在无 WebGL 环境下自动降级为可交互 CSS 3D 纸卡与信封。

### 2. 手作书桌式 3D 编辑器（桌面 & 手机双端优化）
- **纸材与墨水**：冷压水彩纸 / 复古牛皮纸 / 星闪珠光卡纸；典雅咖棕 / 酒红莓果 / 午夜黛蓝 / 松林墨绿 4 种钢笔墨水；中文手写 / 英文手写 / 典雅宋体 3 套随包字体。
- **左页寄语与祝福语库**：支持自定义左内页寄语（自动适配中英文排版）及按「挚友闺蜜 / 恋人爱人 / 家人长辈 / 优雅通用」分类的一键祝福语。
- **贴纸与拟真音效**：12 款复古模切贴纸（支持拖拽、缩放、旋转与悬浮快捷操作条），每款贴纸与翻页、封蜡、拆信均配独立 Web Audio 拟真音效（可一键静音）。
- **一键灵感魔棒**：7 套完整封面 + 纸材 + 墨水 + 火漆 + 贴纸搭配一键预览。
- **手机端画布优先体验**：自适应底部抽屉、可视视口锁定（软键盘弹出不压扁 3D 贺卡）、草稿自动保存在本机 `localStorage`。

### 3. 音乐盒、自定义编曲 & 3D 火漆封缄
- **多模式背景音乐**：
  - 3 首内置 Web Audio 八音盒旋律（生日快乐 / 晚安星河 / 浪漫卡农），零流量直放；
  - **9 键迷你钢琴编曲器**：支持点按试听、自编简谱旋律并随短链接一起分享；
  - 支持填入外部音频直链（HTTP/HTTPS）。
- **4 款 3D 火漆印章**：酒红玫瑰、鎏金星月、松绿橄榄、奶油爱心；长按压印封蜡、收件人点击碎裂火漆拆封信封。
- **定时开启**：支持「立即开启」、「生日零点」或「自选日期时间」定时解锁。

### 4. 纯静态极短链接 & 双模式高清纪念图
- **零后端极短分享链接（`/l/?c=...`）**：采用自研二进制位打包 + Deflate 压缩（v3 协议 `4.`/`5.`，向后兼容 `2.`/`3.` 及旧版 JSON `z.`/`u.`），所有内容编码在链接中，不依赖数据库或服务器存储，可直接部署在 GitHub Pages。
- **双模式高清纪念图导出**：支持一键生成 **横版双页明信片（1720×1200）** 与 **9:16 竖版海报（1080×1920）**，适配微信/朋友圈长按保存。
- **本机寄件箱（`/outbox`）**：自动记录本机生成过的生日信，支持随时复制短链接、打开预览或二次确认移除。

---

## 本地开发与构建

需要 Node.js 20.9 或更高版本。

```bash
npm ci
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

常用命令：

```bash
# TypeScript 类型检查
npm run typecheck

# 静态导出构建（GitHub Pages 子路径）
NEXT_PUBLIC_BASE_PATH=/3d-birthday-cards npm run build
```

## 部署说明

项目已配置 `output: "export"` 纯静态导出与 `.github/workflows/deploy-pages.yml` 工作流。推送至 `main` 分支后会自动构建并部署到 GitHub Pages。

## 目录结构

```text
app/
  page.tsx                 # 3D 封面展台首页
  editor/page.tsx          # 贺卡制作与封缄工作室
  l/page.tsx               # 极短链接拆信页（兼容 /letter）
  outbox/page.tsx          # 本机寄件箱
components/
  CardScene.tsx            # Three.js / CSS 3D 舞台交互容器
  Gallery.tsx              # 7 主题扇形展台与底部 Dock
  Editor.tsx               # 书桌式编辑器与封缄流程
  LetterReader.tsx         # 收件人拆封、阅读、音乐与纪念图导出
  OutboxView.tsx           # 本机寄件箱管理
lib/
  cards.ts                 # 7 款主题、纸材、墨水、贴纸、火漆与灵感配置
  art.ts / art-covers.ts   # Canvas2D 内页排版、纪念图导出与贴图加载
  cover-previews.ts        # 0ms 首帧内联 WebP 预览
  scene-model.ts           # 3D 贺卡折页、贴纸与火漆信封建模
  scene-stage.ts           # WebGL 舞台、相机缩放、陀螺仪与射线交互
  scene-fx.ts              # GLSL 烫金扫光与 7 主题专属 3D 微动效
  sfx.ts                   # Web Audio 拟真音效与八音盒/自定义旋律合成
  share-codec.ts           # 极短链接二进制 v3/v2/v1 编解码与本地存储
public/assets/cards/       # 7 款主题的 PBR 封面与透明 RGBA 内页 WebP 资源
```

---

## 致谢 · Inspiration

本项目的立体纸艺贺卡与烫金交互灵感源自 [3dcards.theliang.com](https://3dcards.theliang.com/)（[@dongliang1993/3d-card-master](https://github.com/dongliang1993/3d-card-master)），特此致谢。本仓库代码与 7 套封面、内页插画素材均为围绕生日贺卡场景独立实现与创作。

## 开源许可 · License

本项目采用 **[PolyForm Noncommercial License 1.0.0](./LICENSE)** 开源协议：允许个人学习、非商业用途的自由使用、修改与分发，**禁止任何商业用途**，分发或衍生作品须完整保留 [LICENSE](./LICENSE) 及顶部的 `Required Notice`。

