# Deepgram Agent

A voice and chat AI agent widget for Deepgram-powered sites, powered by [@lukeocodes/composite-voice](https://github.com/lukeocodes/composite-voice).

## What it does

- Unified voice and text chat through composite-voice's 5-role pipeline (Input → STT → LLM → TTS → Output)
- Deepgram Nova-3 for speech-to-text, Claude Haiku for LLM, Deepgram Aura-2 for text-to-speech
- Mic and speaker toggles for independent audio input/output control
- Skill system — pass your own tools, or use the built-in Deepgram Console skill set
- Risk-aware tool execution — safe skills run immediately, confirm/dangerous skills gate on user approval
- localStorage state persistence across page reloads
- Built as a UMD bundle (`DeepgramAgent`) for embedding via `<script>` tag

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

## Setup

```bash
git clone git@github.com:deepgram/agent.git
cd agent
pnpm install
```

## Development

```bash
pnpm dev    # Vite dev server on :5173
```

## Build

```bash
pnpm build
# Output: dist/deepgram-agent.umd.js
```

## Embedding

Load the built bundle and call `DeepgramAgent.init()`. See [`examples/`](examples/) for full working integrations:

| Example | Site | Pattern |
|---|---|---|
| [`deepgram-console`](examples/deepgram-console/) | Deepgram Console | FAB toggle, built-in skill set |
| [`deepgram-docs`](examples/deepgram-docs/) | Deepgram Docs | Inline embed, custom docs skills |
| [`deepgram-web`](examples/deepgram-web/) | Deepgram Web | FAB toggle, custom marketing skills |

### Staging

Pass `staging: true` (or detect from hostname) to switch all endpoints to staging automatically:

```js
DeepgramAgent.init({
  buttonId: 'dg-ask-ai-btn',
  staging: window.location.hostname.includes('staging'),
  skills: DeepgramAgent.skillRegistry,
});
```

### Custom skills

```js
DeepgramAgent.init({
  containerId: 'agent-container',
  systemPrompt: 'You are an assistant for Acme Corp...',
  skills: [
    {
      id: 'search',
      name: 'Search',
      description: 'Search the site',
      category: 'navigation',
      risk: 'safe',
      parameters: [{ name: 'query', type: 'string', description: 'Search query', required: true }],
      execute: async ({ query }) => {
        const data = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json());
        return { success: true, message: `Found ${data.length} results`, data };
      },
    },
  ],
});
```

The `BASE_AGENT_GUIDELINES` (TTS formatting, behavioral rules) are always prepended automatically — `systemPrompt` adds your site-specific context on top.

## License

MIT — see [LICENSE](LICENSE)
