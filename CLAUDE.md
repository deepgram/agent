# agent — Voice Agent Reference Implementation

> **This repo is part of the Deepgram DX stack.** Cross-stack architecture docs live in `deepgram/dx-stack`. A PostToolUse hook will remind you when you edit cross-stack-relevant files, but you are also responsible for catching changes the hook doesn't cover.

## DX Stack Rules

1. **Incremental changes, comprehensive reviews.** Make changes incrementally. Before finishing any task, do a comprehensive review to spot architectural misses — port conflicts, auth flow breakage, env var mismatches, or contract changes that affect other services.

2. **Update dx-stack docs when you change cross-stack behavior.** If your change affects ports, auth flows, env vars, redirect URIs, API contracts, or deployment config, update the reference docs in `deepgram/dx-stack` before finishing.

3. **Know the architecture.** Read `deepgram/dx-stack/CLAUDE.md` for the full stack context — port map, auth flows, service-to-service communication, and environment matrix.

### What requires dx-stack updates

| Change | Update |
|--------|--------|
| Port changes | `dx-stack/CLAUDE.md` port map + `docs/runbook.md` |
| Auth flow / session changes | `dx-stack/docs/auth.md` |
| OIDC client changes | `dx-stack/docs/auth.md` client table |
| Env var changes | `dx-stack/docs/environments.md` |
| New cross-service endpoints | `dx-stack/CLAUDE.md` cross-service section |
| Deployment / Fly config changes | `dx-stack/CLAUDE.md` deployment section |
| Redirect URI changes | `dx-stack/docs/auth.md` + seed.ts |

## Repo Overview

Voice agent SDK, React UI library, and bundled web component library.

**Stack:** Bun workspaces monorepo, TypeScript, Vite

**Packages:**
- `packages/sdk/` — `@deepgram/agent` — Browser/Node WebSocket client with microphone, audio playback, and VAD
- `packages/react/` — `@deepgram/agent-react` — React hooks and components for `@deepgram/agent`
- `packages/widget/` — `@deepgram/agent-widget` — Self-contained CDN widget (UMD + ESM), no framework required
- `examples/` — Example apps (TypeScript, React hooks, bundled UMD)

**Auth:** This repo does not use dx-id. It connects directly to the Deepgram Agent API using Deepgram API keys. The SDK authenticates via the `Sec-WebSocket-Protocol` header trick (not URL query params).

**Build:** `bun run --filter '@deepgram/*' build` — builds all packages in dependency order.

**Typecheck:** `bun run --filter '@deepgram/*' typecheck` — runs `tsc --noEmit` per package.
