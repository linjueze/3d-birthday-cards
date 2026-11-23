# Birthday Cards · 生日信

用三维纸艺贺卡写下生日祝福。选封面和纸材，添加文字、贴纸与音乐，再把贺卡装进信封并亲手盖上火漆。寄出后会得到收件人链接和私密寄件箱链接。

## 运行

需要 Node.js 20.9 或更高版本。

```sh
npm ci
npm run dev
```

访问 [localhost:3000](http://localhost:3000)。生产模式使用 `npm run build` 和 `npm start`。运行 `npm run typecheck` 可独立检查 TypeScript。

## 寄送和本地数据

- 发件人把生成的收件人链接交给对方。收件人打开链接时，请保证运行应用的地址可以从对方设备访问。
- 「生日零点」和「自选日期」按发件设备时区转换为时间戳。服务器在送达时间前锁住正文、贴纸与音频，并保存首次拆封时间。
- 信件保存到 `.data/letters`，可以通过环境变量 `BIRTHDAY_DATA_DIR` 指定持久化目录。换机器运行时，备份整个数据目录即可保留原有信件和寄件箱。
- 寄件箱链接凭链接访问。当前浏览器会记住寄件箱链接，供连续寄送使用。
- 支持 15 MiB 以内的 MP3、WAV 或 M4A 自定义音频。内置八音盒通过 Web Audio 合成。

## 纸艺材质

项目随包提供字体。封面插画、纸纤维、金箔、压纹、内衬和贴纸由 Canvas2D 在本地生成。Three.js 渲染铰链、卡纸厚度、多层浮雕和信封动画。在 WebGL 不可用的浏览器中，会用 Canvas2D 和 CSS 展示可交互的纸卡与信封。

可在 `lib/art.ts` 的 `COVER_MANIFEST` 为某个封面加入同构图的 WebP 图层。支持 `base`、`illustration`、`foil`、`height` 与 `composite`，默认尺寸为 768 × 1024。透明插画和烫金图层保留 Alpha 通道。
