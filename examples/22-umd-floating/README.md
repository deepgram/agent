# Floating FAB — Bundled UMD

CDN script tag, no build step. Floating action button reveals an overlay panel. Uses `DeepgramAgent.init()` with `layout: 'floating'`.

**Package:** `@deepgram/agent-widget` (UMD bundle)

![Screenshot](screenshot.png)

## Run

```bash
# From the repo root — build the UMD bundle first
bun run --filter '@deepgram/agent-widget' build
bun run dev:examples
# Open http://localhost:5173/22-umd-floating/
```
