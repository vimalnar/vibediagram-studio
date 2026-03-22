# VibeDiagram Studio

This README is the **primary source of truth** for humans and AI editors.
If your editor does not automatically load `AGENTS.md`, `CLAUDE.md`, or `.cursorrules`, follow the instructions in this README directly.
VibeDiagram Studio is a web-first framework for creating educational diagrams/animations that can be previewed in-browser and exported for video.

This repo is structured into three layers:

1. Libraries (Three.js, R3F, Theatre, React-Spring, KaTeX, Playwright, FFmpeg)
2. Template stack (runtime, panel shell, controls, export/testing/CI)
3. Implementations (what each specific video animation actually is)

## Layer 1: Libraries

- Runtime/render: `three`, `@react-three/fiber`, `@react-three/drei`
- Animation/timeline: `@react-spring/three`
- Authoring: `@theatre/core`, `@theatre/r3f`, optional `@theatre/studio`
- Math/text: `react-katex`, `katex`
- Export/testing/tooling: Playwright, Vitest, ESLint, Prettier

## Layer 2: Template stack

- App shell + panel + performance guardrails: `src/App.tsx`
- Default visual mode: white canvas + light UI chrome (implementation-first contrast)
- Runtime URL flags (`capture`, `panel`, `phase`, `implementation`): `src/runtime/params.ts`
- Theatre Studio bootstrap: `src/theatreStudio.ts`
- Implementation contract: `src/template/implementation.ts`
- Deterministic frame export: `scripts/export-frames.mjs`
- One-command build+preview+export: `scripts/export-video.mjs`
- CI pipeline: `.github/workflows/ci.yml`

## Layer 3: Implementations

Each implementation now follows a single-file convention:

- `src/implementations/<id>.impl.tsx`

Current implementations:

- `transformer` (full working example)
- `blackhole-gravity` (gravity + spacetime curvature example)
- `starter` (copy/edit this as the one-file base)
- All built-ins are now self-contained in their `.impl.tsx` files (no `src/scenes/*` dependency).

Registry:

- `src/implementations/index.ts`

## Create a new implementation

Recommended (auto-scaffold + auto-register):

```bash
npm run new:implementation -- --id entropy --title "Entropy in 3D"
```

This command will:

- create `src/implementations/entropy.impl.tsx`
- auto-register it in `src/implementations/index.ts`
- give you the URL hint (`?implementation=entropy`)

Manual fallback:

1. Copy `src/implementations/starter.impl.tsx` to `src/implementations/<your-id>.impl.tsx`.
2. Keep metadata, camera, timeline, and scene rendering in that one file.
3. Register it in `src/implementations/index.ts`.
4. Set `VITE_IMPLEMENTATION=<your-id>` in `.env.local`.

You are not limited to transformer-style scenes. Each implementation can define its own geometry, timing, labels, and behavior in code.

## AI Editor Setup

This repo ships editor instruction files so AI tools produce consistent one-file implementations:

- Codex/agents: `AGENTS.md`
- Claude Code: `CLAUDE.md`
- Cursor: `.cursorrules`

Simple prompt workflow:

You can start with a plain prompt like: `Create an animation of entropy.`
The AI should infer and perform this flow from README rules:
1. Scaffold with `npm run new:implementation -- --id <topic-id> --title "<Topic Title>"`.
2. Keep all scene logic in `src/implementations/<topic-id>.impl.tsx`.
3. Preserve existing studio style/controls.
4. Run `npm run lint && npm run build`.
5. Return the implementation id and URL hint (`?implementation=<topic-id>`).

Suggested explicit one-shot prompt:

`Create an animation of entropy as a new implementation. Use the framework conventions, scaffold with npm run new:implementation, keep everything in one .impl.tsx file, register it, and run lint+build.`

Universal fallback prompt (works even when repo rule files are not auto-read):

`Read README.md and treat it as the source of truth. Create a new educational animation implementation using npm run new:implementation -- --id <topic-id> --title "<Topic Title>", keep all scene logic in src/implementations/<topic-id>.impl.tsx, preserve the framework style/controls, and run npm run lint && npm run build.`

Optional Theatre state persistence:

- Export state JSON from Theatre Studio
- Import it in your implementation module
- Pass it via `theatre.state` in your `ImplementationDefinition`

## Quick start

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Browser playback + export

Live playback in browser:

```bash
npm run dev
```

In-app transport toolbar:

- `Scene` dropdown switches between implementations instantly (great for quick vibe-coding passes).
- `Play/Pause` controls timeline playback.
- Mouse controls are fully enabled: rotate, pan, and wheel-zoom.
- `Zoom - / +` provides extra zoom control from the toolbar.
- `Lock Pitch` freezes vertical tilt; `Pitch-` / `Pitch+` nudges the pitch while locked.
- `Reset View` returns to the implementation's default camera framing.
- `Record` resets to frame 0, records one pass at 60fps/high bitrate, then downloads MP4.
- Recording uses your current camera framing (position/pan/zoom/pitch).
- During recording, non-essential UI is hidden from the captured output.
- If your browser cannot encode MP4 via `MediaRecorder`, use `npm run export:video` for guaranteed 1080p MP4 output.

Install Playwright Chromium (first time):

```bash
npm run playwright:install
```

Deterministic frame export (dev server already running):

```bash
npm run export:frames
```

One-command build + preview + export (+ optional encode):

```bash
npm run export:video
```

Useful export env vars:

- `IMPLEMENTATION` (default: `transformer`)
- `ENCODE=1` to output mp4 via ffmpeg
- `FPS`, `SECONDS`, `WIDTH`, `HEIGHT`
- `PREVIEW_PORT` (default: `4273`) for `export:video`

You can also switch implementation by URL:

- `?implementation=transformer`
- `?implementation=blackhole-gravity`

## Environment

Example `.env.local`:

```bash
VITE_IMPLEMENTATION=transformer
VITE_ENABLE_THEATRE_STUDIO=0
```

Set `VITE_ENABLE_THEATRE_STUDIO=1` in dev when you want Theatre Studio UI.
