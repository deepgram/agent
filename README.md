# Deepgram Console Agent

Voice and chat AI assistant for the [Deepgram Console](https://console.deepgram.com), powered by [@lukeocodes/composite-voice](https://github.com/lukeocodes/composite-voice).

## Architecture

This is a pnpm monorepo with two packages:

### `packages/client` — Widget

A React sidebar widget that embeds into the Elm-based Deepgram Console UI. Features:

- Unified voice and text chat through composite-voice's 5-role pipeline (Input → STT → LLM → TTS → Output)
- Deepgram Nova-3 for speech-to-text, Claude Haiku for LLM, Deepgram Aura-2 for text-to-speech
- Mic and speaker toggles for independent control of audio input/output
- Barge-in support — interrupt the agent by speaking or typing
- Skill system for navigating pages, managing API keys, projects, billing, usage, and team members
- I/O modality awareness — the LLM knows whether the user is typing or speaking
- localStorage state persistence across page reloads
- Built as a UMD bundle for embedding via `<script>` tag

### `packages/server` — Proxy

An Express proxy server that keeps API keys server-side:

- Uses composite-voice's `createExpressProxy()` middleware
- WebSocket proxy for Deepgram STT and TTS
- HTTP proxy for Anthropic LLM
- CORS and header fixes for browser SDK compatibility

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Bun](https://bun.sh/) (for running the proxy server)
- A [Deepgram API key](https://console.deepgram.com/)
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

```bash
# Install dependencies
pnpm install

# Configure the proxy server
cp packages/server/.env.sample packages/server/.env
# Edit packages/server/.env with your API keys
```

## Development

```bash
# Start both client dev server and proxy server
pnpm dev

# Or run individually:
cd packages/server && bun server.ts        # Proxy on :3001
cd packages/client && pnpm dev             # Vite dev on :5173
```

## Build

```bash
# Build both packages
pnpm build

# Output:
# packages/client/dist/  — UMD + ES bundles for embedding
# packages/server/       — Run directly with bun
```

## Embedding in Console UI

Add the built widget to the console's `public/` directory and load it:

```html
<script src="/console-agent/deepgram-console-agent.umd.js"></script>
<script>
  DeepgramConsoleAgent.init({
    buttonId: 'dg-ask-ai-btn',
    anthropicProxyUrl: 'https://your-proxy/api/proxy/anthropic',
    deepgramProxyUrl: 'https://your-proxy/api/proxy/deepgram',
  });
</script>
```

## Deployment

The proxy server includes a Dockerfile and fly.toml for deployment to [Fly.io](https://fly.io):

```bash
cd packages/server
fly deploy
fly secrets set DEEPGRAM_API_KEY=... ANTHROPIC_API_KEY=...
```

## License

MIT - see [LICENSE](LICENSE)
