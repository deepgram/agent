# Deepgram Voice Agent

Voice agent SDK, React components, and embeddable widget for the [Deepgram Agent API](https://developers.deepgram.com/docs/voice-agent).

```
@deepgram/sdk  -->  @deepgram/agent  -->  @deepgram/agent-react  -->  @deepgram/agent-react-ui
                                                                  -->  @deepgram/agent-widget
```

## Packages

| Package | Description |
|---------|-------------|
| [`@deepgram/agent`](packages/sdk/) | Core SDK -- WebSocket session, microphone capture, audio playback |
| [`@deepgram/agent-react`](packages/react/) | React provider and hooks for agent state, conversation, controls |
| [`@deepgram/agent-react-ui`](packages/react-ui/) | Pre-built React UI components with CSS variable theming |
| [`@deepgram/agent-widget`](packages/widget/) | Self-contained widget (UMD + ESM) -- drop into any page, no framework needed |

## Quick Start

### Widget (no framework)

```html
<script src="https://cdn.deepgram.com/agent-widget/latest/widget.umd.js"></script>
<script>
  DeepgramAgent.init({
    tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()),
    agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
  });
</script>
```

### React

```tsx
import { AgentProvider, useAgentState, useAgentConversation } from "@deepgram/agent-react-ui";
import "@deepgram/agent-react-ui/styles.css";
import { AgentConversation, AgentStartButton, AgentTextInput } from "@deepgram/agent-react-ui";

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
import { AgentSession, AgentMicrophone, AgentPlayer } from "@deepgram/agent";

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

All visual properties are CSS custom variables on `[data-dg-agent]`, with adaptive `light-dark()` defaults:

```css
[data-dg-agent] {
  --dg-va-primary: #6366f1;      /* brand colour */
  --dg-va-bg: #0d1117;           /* panel background */
  --dg-va-text: #e6e6e6;         /* primary text */
  --dg-va-radius: 12px;          /* panel border radius */
}
```

Color scheme options: `auto` (follows OS preference), `light`, `dark`, or class-based (`{ mode: 'class', darkSelector: '.dark' }` for Tailwind / next-themes).

See the [widget README](packages/widget/) for the full list of 26 CSS variables.

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
