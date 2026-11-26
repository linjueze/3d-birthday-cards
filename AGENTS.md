<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Notes (`3d-birthday-cards`)

- **Static Export**: Built as a zero-backend static site (`output: "export"`) deployed to GitHub Pages under `/3d-birthday-cards`. Always pass `NEXT_PUBLIC_BASE_PATH=/3d-birthday-cards` when verifying production builds (`npm run build`).
- **7 Bespoke 3D Themes**: `candlelight-cake`, `starry-wish`, `bloom-garden`, `confetti-atelier`, `sakura-mail`, `teddy-birthday`, `atelier-tea`. Each theme provides PBR cover maps (`base.webp`, `relief.webp`, `foil.webp`, `height.webp`), transparent RGBA `inside.webp` (for cross-browser/WeChat compatibility without `multiply` blend mode), inline previews in `lib/cover-previews.ts`, and bespoke living FX in `lib/scene-fx.ts`.
- **Short Links (`lib/share-codec.ts`)**: Binary v3 (`4.`/`5.`) supports up to 16 templates while preserving full backward compatibility with legacy v2 (`2.`/`3.`) and v1 JSON (`z.`/`u.`) tokens.
