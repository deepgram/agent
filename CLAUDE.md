# agent -- Voice Agent Reference Implementation

> **This repo is part of the Deepgram DX stack.** Cross-stack architecture docs live in `deepgram/dx-stack`. A PostToolUse hook will remind you when you edit cross-stack-relevant files, but you are also responsible for catching changes the hook doesn't cover.

## DX Stack Rules

1. **Incremental changes, comprehensive reviews.** Make changes incrementally. Before finishing any task, do a comprehensive review to spot architectural misses -- port conflicts, auth flow breakage, env var mismatches, or contract changes that affect other services.

2. **Update dx-stack docs when you change cross-stack behavior.** If your change affects ports, auth flows, env vars, redirect URIs, API contracts, or deployment config, update the reference docs in `deepgram/dx-stack` before finishing.

3. **Know the architecture.** Read `deepgram/dx-stack/CLAUDE.md` for the full stack context -- port map, auth flows, service-to-service communication, and environment matrix.

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

Bun workspaces monorepo: voice agent SDK and embeddable widget. React hooks/components live in separate repos and are consumed via `file:` pointers for local development.

```
@deepgram/agent  ←  @deepgram/react (external)  ←  @deepgram/ui (external)  ←  @deepgram/agent-widget
```

### Packages

| Directory | Package | Purpose |
|-----------|---------|---------|
| `packages/sdk/` | `@deepgram/agent` | Core WebSocket client (`AgentSession`), microphone capture (`AgentMicrophone` with optional Silero VAD), audio playback (`AgentPlayer` with AnalyserNode volume/frequency APIs) |
| `packages/widget/` | `@deepgram/agent-widget` | Self-contained UMD + ESM widget. Bundles Preact (react→preact/compat aliases). `init()` mounts one of 6 layouts: sidebar, inline, floating, button, embedded, orb. All styling comes from `@deepgram/ui`'s compiled Tailwind CSS (no widget-local styles.css). |
| `examples/` | -- | 17 examples: TS source (01-07), React (10-15), UMD (20-23). Served by `examples/serve.ts`. |

### External Dependencies (sibling repos)

| Repo | Package | Consumed via |
|------|---------|-------------|
| `deepgram/react` | `@deepgram/react` | `file:../react/packages/react` in root and widget `package.json` |
| `deepgram/ui` | `@deepgram/ui` | `file:../ui/packages/ui` in root and widget `package.json` |

`@deepgram/ui-registry` (shadcn registry build) also lives in the `deepgram/ui` repo.

### Cross-Repo Development Setup

The root `package.json` and `packages/widget/package.json` both use `file:` pointers to sibling checkouts of `deepgram/react` and `deepgram/ui`. This means local development requires all three repos cloned as siblings:

```
~/Projects/deepgram/
  agent/          ← this repo
  react/          ← deepgram/react
  ui/             ← deepgram/ui
```

After cloning, `bun install` resolves the `file:` pointers as symlinks. Changes to `@deepgram/react` or `@deepgram/ui` are picked up immediately without re-installing.

### Stack

- **Runtime:** Bun 1.3+
- **Build:** Vite 8, TypeScript 5.9
- **Testing:** `bun test`, happy-dom
- **Deployment:** Fly.io (`fly deploy` from root, app: `deepgram-agent-examples`)

## Commands

```bash
bun run build              # Build all packages (dependency order)
bun run typecheck           # tsc --noEmit per package
bun run test                # Unit tests across all packages
bun run test:e2e            # Playwright e2e tests (tests/e2e/)
bun run dev                 # Watch-build all packages
bun run dev:examples        # Examples dev server on :5173 (uses op for env)
```

## Auth

This repo does **not** use dx-id. It connects directly to the Deepgram Agent API.

The SDK authenticates via the `Sec-WebSocket-Protocol` header trick -- the browser `WebSocket` constructor doesn't allow custom headers, so the Deepgram SDK passes the token as a subprotocol value. This is handled internally by `@deepgram/sdk`'s `CustomDeepgramClient`.

Two auth modes in `AgentSessionConfig.auth`:
- `{ apiKey: string }` -- raw Deepgram API key, uses `Authorization: Token {key}`. Server-side only.
- `{ tokenFactory: () => Promise<string> }` -- short-lived bearer tokens from `POST /v1/auth/grant`. Called at connect-time and before every reconnect attempt. Browser-safe.

## Key Architecture Decisions

### Playback-aware mode transitions
The `AgentProvider` (in `@deepgram/react`) tracks speaking/listening mode. The `AgentAudioDone` server event fires when the server finishes _sending_ audio, but playback continues in the browser. The provider delays the transition from `"speaking"` to `"listening"` until `AgentPlayer.getRemainingPlaybackTime()` reaches zero.

### Audio buffering before SettingsApplied
`AgentSession` queues audio frames sent before the server acknowledges settings. Once `SettingsApplied` fires, the queue is flushed.

### Widget Preact aliasing
`@deepgram/agent-widget` aliases `react` and `react-dom` to `preact/compat` in its Vite config, keeping the UMD bundle small while reusing all React components from `@deepgram/ui`.

### Orb visualization
Canvas 2D animated hoop with idle/listening/talking states. Audio-reactive via volume getter functions (`getInputVolume`, `getOutputVolume`) sampled per animation frame.

### LiveWaveform
Accepts a single getter `() => number` or an array of getters. When multiple are provided, the max value is used per frame.

### Client tools
`useAgentClientTool` hook (in `@deepgram/react`) dynamically registers/unregisters function call handlers scoped to component lifecycle. The provider checks dynamic tools first, then falls back to the `onFunctionCall` prop.

## File Layout

```
packages/
  sdk/src/
    agent-session.ts       # Core WebSocket session (AgentSession)
    audio/microphone.ts    # AgentMicrophone (PCM capture + optional Silero VAD)
    audio/player.ts        # AgentPlayer (PCM decode, queue, interrupt, volume)
    types/config.ts        # AgentSessionConfig, AuthConfig, TokenFactory
    types/events.ts        # AgentSessionEvents (typed EventEmitter map)
    types/messages.ts      # Server message types (Welcome, ConversationText, etc.)
    token/factory.ts       # CachingTokenFactory
    connection/keepalive.ts
  widget/src/
    index.ts               # init() entry point, layout routing, theme/scheme injection
    widget.tsx             # SidebarWidget, InlineWidget, FloatingWidget, etc.
    types.ts               # WidgetConfig, WidgetLayout, WidgetTheme, etc.
    components/            # ConversationPanel, icons
examples/
  01-07                    # Widget examples (TypeScript source imports)
  10-15                    # React examples
  20-23                    # UMD bundle examples
  serve.ts                 # Bun HTTP server for Fly deployment
```
