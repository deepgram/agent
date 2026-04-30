# Deepgram Voice Agent

Voice agent SDK and embeddable widget for the [Deepgram Agent API](https://developers.deepgram.com/docs/voice-agent).

```
@deepgram/agents  ←  @deepgram/react (external)  ←  @deepgram/ui (external)  ←  @deepgram/agents-widget
```

## Packages

| Package | Description |
|---------|-------------|
| [`@deepgram/agents`](packages/sdk/) | Core SDK -- WebSocket session, microphone capture, audio playback |
| [`@deepgram/agents-widget`](packages/widget/) | Self-contained widget (UMD + ESM) -- drop into any page, no framework needed |

React hooks and UI components live in their own repos:

| Package | Repo |
|---------|------|
| [`@deepgram/react`](https://github.com/deepgram/react) | React provider and hooks for agent state, conversation, controls |
| [`@deepgram/ui`](https://github.com/deepgram/ui) | Pre-built React UI components with Tailwind CSS theming |

## Quick Start

### Widget (no framework)

```bash
npm install @deepgram/agents-widget
```

```ts
import { init } from "@deepgram/agents-widget";

init({
  tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()),
  agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
});
```

The package also ships a UMD bundle at `dist/widget.umd.js` for `<script>`-tag usage; host it from your own server.

### React

```tsx
import { AgentProvider, useAgentState, useAgentConversation } from "@deepgram/ui";
import "@deepgram/ui/styles.css";
import { AgentConversation, AgentStartButton, AgentTextInput } from "@deepgram/ui";

function App() {
  return (
    <AgentProvider
      config={{
        auth: { tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()) },
        agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
      }}
    >
      <AgentStartButton />
      <AgentConversation />
      <AgentTextInput />
    </AgentProvider>
  );
}
```

### SDK only

```ts
import { AgentSession, AgentMicrophone, AgentPlayer } from "@deepgram/agents";

const session = new AgentSession({
  auth: { tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()) },
  agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
});

const player = new AgentPlayer();
session.on("audio", (chunk) => player.queue(chunk));

const mic = new AgentMicrophone((data) => session.sendAudio(data));
await session.connect();
await mic.start();
```

## Authentication

The SDK authenticates via the `Sec-WebSocket-Protocol` header (not URL query params). Two auth modes:

- **API key** (server-side only): `{ apiKey: "your-deepgram-api-key" }`
- **Token factory** (browser-safe): `{ tokenFactory: () => fetch('/api/token').then(r => r.text()) }`

The token factory is called before every connection and reconnection attempt, so tokens can be short-lived and rotated automatically.

## Theming

All styling comes from [`@deepgram/ui`](https://github.com/deepgram/ui)'s compiled Tailwind CSS. The widget exposes 26 CSS custom properties on `[data-dg-agent]` for runtime theming — see the [widget README](packages/widget/) for the full list.

## Examples

17 examples live in [`examples/`](examples/):

| Range | Type | Examples |
|-------|------|----------|
| 01-07 | Widget (TypeScript) | sidebar, inline, floating, button, embedded, orb, floating-orb |
| 10-15 | React | sidebar, inline, floating, standalone UI, voice button, orb |
| 20-23 | UMD bundle | sidebar, inline, floating, console |

Run locally:

```bash
bun run dev:examples    # Vite dev server on :5173
```

Live demo: [deepgram-agent-examples.fly.dev](https://deepgram-agent-examples.fly.dev)

## Roadmap

`@deepgram/react` and `@deepgram/ui` have been extracted into their own repos as generic Deepgram browser primitives:

| Package | Repo |
|---------|------|
| `@deepgram/agents` | This repo (`packages/sdk/`) |
| `@deepgram/agents-widget` | This repo (`packages/widget/`) |
| `@deepgram/react` | [`deepgram/react`](https://github.com/deepgram/react) |
| `@deepgram/ui` | [`deepgram/ui`](https://github.com/deepgram/ui) |
| `@deepgram/browser` | Planned: browser instrumentation SDK (non-agent), may re-export agent bits |

## Development

**Prerequisites:** [Bun](https://bun.sh/) 1.3+

```bash
git clone git@github.com:deepgram/agent.git
cd agent
bun install
```

```bash
bun run build              # Build all packages
bun run typecheck           # Type-check all packages
bun run test                # Run tests
bun run dev:examples        # Run examples dev server (:5173)
```

## Deployment

The examples app deploys to Fly.io:

```bash
fly deploy    # deploys to deepgram-agent-examples.fly.dev
```

## License

MIT -- see [LICENSE](LICENSE)
