# @deepgram/agents-widget

Self-contained voice agent widget for the [Deepgram Agent API](https://developers.deepgram.com/docs/voice-agent). Drop into any page via ESM import or self-hosted UMD bundle -- no framework required.

Bundles Preact internally (React components from `@deepgram/ui` are aliased to `preact/compat`).

## Install

```bash
npm install @deepgram/agents-widget
```

## Quick Start

```ts
import { init } from "@deepgram/agents-widget";

const destroy = init({
  tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()),
  agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
});

// Later: destroy() to unmount
```

A UMD bundle ships at `dist/widget.umd.js` for `<script>`-tag usage. Host it from your own server:

```html
<script src="/path/to/widget.umd.js"></script>
<script>
  DeepgramAgent.init({
    tokenFactory: () => fetch('/api/deepgram-token').then(r => r.text()),
    agent: { think: { provider: { type: 'open_ai' }, model: 'gpt-4o-mini' } },
  });
</script>
```

## init(config)

Mounts the widget and returns a teardown function.

```ts
function init(config: WidgetConfig): () => void;
```

## Layouts

Six layout modes:

| Layout | Description | Requires `containerId` |
|--------|-------------|------------------------|
| `sidebar` | Panel slides in from the right edge (default) | No |
| `floating` | FAB button reveals an overlay panel | No |
| `inline` | Mounts into a host container element | Yes |
| `embedded` | Card filling container width with aspect-ratio height, includes chat | Yes |
| `button` | Single button: click to talk, click to disconnect | No (optional) |
| `orb` | Animated orb with start/stop, audio-reactive | No (optional) |

```js
// Sidebar (default)
DeepgramAgent.init({ agent, tokenFactory });

// Inline
DeepgramAgent.init({ agent, tokenFactory, layout: "inline", containerId: "my-container" });

// Floating
DeepgramAgent.init({ agent, tokenFactory, layout: "floating" });

// Button
DeepgramAgent.init({ agent, tokenFactory, layout: "button" });

// Embedded
DeepgramAgent.init({ agent, tokenFactory, layout: "embedded", containerId: "my-container" });

// Orb
DeepgramAgent.init({ agent, tokenFactory, layout: "orb" });
```

## Configuration

```ts
interface WidgetConfig {
  // Auth (one required)
  apiKey?: string;                         // Deepgram API key (dev/server only)
  tokenFactory?: () => Promise<string>;    // Browser-safe token factory

  // Agent
  agent: AgentSettingsObject | string;     // Inline config or pre-built agent UUID

  // Layout
  layout?: WidgetLayout;                   // Default: "sidebar"
  placement?: WidgetPlacement;             // Default: "bottom-right"
  containerId?: string;                    // Required for inline/embedded
  buttonId?: string;                       // External button to toggle panel
  defaultOpen?: boolean;                   // Start panel open (sidebar/floating)
  dismissible?: boolean;                   // Allow close (default: true)

  // Features
  showTranscript?: boolean;                // Default: true
  showMicToggle?: boolean;                 // Default: true
  showSpeakerToggle?: boolean;             // Default: true
  showTextInput?: boolean;                 // Default: true

  // Session overrides
  overrides?: {
    systemPrompt?: string;                 // Override system prompt
    greeting?: string;                     // Override greeting
  };

  // Appearance
  colorScheme?: WidgetColorScheme;         // Default: "auto"
  theme?: WidgetTheme;                     // CSS variable overrides
  text?: WidgetTextContent;                // UI label overrides

  // Callbacks
  on?: WidgetCallbacks;
  playerSampleRate?: number;               // Default: 24_000
}
```

## Theming

### Color Scheme

Controls light/dark mode behavior:

```js
// Auto: follows prefers-color-scheme (default)
colorScheme: "auto"

// Force a mode
colorScheme: "dark"
colorScheme: "light"

// Class-based (Tailwind / next-themes)
colorScheme: { mode: "class", darkSelector: ".dark" }
colorScheme: { mode: "class", darkSelector: ".dark", lightSelector: ".light" }
```

### Theme Tokens

Override individual CSS custom properties via the `theme` object:

```js
DeepgramAgent.init({
  tokenFactory,
  agent,
  theme: {
    primary: "#6366f1",
    background: "#0d1117",
    text: "#e6e6e6",
    panelRadius: "12px",
    font: "'Inter', system-ui, sans-serif",
  },
});
```

Available tokens:

| Token | CSS Variable | Default |
|-------|-------------|---------|
| `primary` | `--dg-va-primary` | `#13EF93` |
| `primaryHover` | `--dg-va-primary-hover` | `color-mix(85% primary, #000)` |
| `primaryActive` | `--dg-va-primary-active` | `color-mix(70% primary, #000)` |
| `onPrimary` | `--dg-va-on-primary` | `light-dark(#000, #000)` |
| `background` | `--dg-va-bg` | `light-dark(#fff, #18181c)` |
| `backgroundRaised` | `--dg-va-bg-raised` | `light-dark(#f3f4f6, #222228)` |
| `backgroundInput` | `--dg-va-bg-input` | `light-dark(#f3f4f6, #1e1e24)` |
| `backgroundHover` | `--dg-va-bg-hover` | `light-dark(#f9fafb, #1a1a1f)` |
| `backgroundActive` | `--dg-va-bg-active` | `light-dark(#f3f4f6, #222228)` |
| `text` | `--dg-va-text` | `light-dark(#111827, #fff)` |
| `textMuted` | `--dg-va-text-muted` | `light-dark(#6b7280, #8b8b9a)` |
| `border` | `--dg-va-border` | `light-dark(rgba(0,0,0,.1), rgba(255,255,255,.08))` |
| `error` | `--dg-va-error` | `light-dark(#dc2626, #ef4444)` |
| `overlay` | `--dg-va-overlay` | `light-dark(rgba(0,0,0,.25), rgba(0,0,0,.5))` |
| `userMessageBackground` | `--dg-va-msg-user-bg` | -- |
| `userMessageBorder` | `--dg-va-msg-user-border` | -- |
| `panelRadius` | `--dg-va-radius` | `16px` |
| `buttonRadius` | `--dg-va-btn-radius` | `10px` |
| `inputRadius` | `--dg-va-input-radius` | `8px` |
| `messageRadius` | `--dg-va-msg-radius` | `12px` |
| `fabSize` | `--dg-va-fab-size` | `56px` |
| `padding` | `--dg-va-padding` | `16px` |
| `font` | `--dg-va-font` | `system-ui, -apple-system, sans-serif` |
| `aspect` | `--dg-va-aspect` | `4 / 3` |
| `minHeight` | `--dg-va-min-h` | `320px` |
| `maxHeight` | `--dg-va-max-h` | `80vh` |

You can also override tokens directly in CSS:

```css
[data-dg-agent] {
  --dg-va-primary: #6366f1;
  --dg-va-bg: #0d1117;
}
```

### Text Content

Override UI labels:

```js
DeepgramAgent.init({
  tokenFactory,
  agent,
  text: {
    name: "Support Agent",
    startLabel: "Talk to us",
    stopLabel: "End chat",
    connectingLabel: "Connecting...",
    inputPlaceholder: "Ask a question...",
    emptyStateHint: "Click Start to begin",
  },
});
```

## Callbacks

```js
DeepgramAgent.init({
  tokenFactory,
  agent,
  on: {
    onConnect: () => console.log("Connected"),
    onDisconnect: (reason) => console.log("Disconnected:", reason),
    onError: (err) => console.error(err),
    onMessage: (msg) => console.log(`${msg.role}: ${msg.content}`),
    onAgentStartedSpeaking: (msg) => {},
    onFunctionCallRequest: (msg) => {},
    onAgentError: (msg) => {},
    onReconnecting: (attempt, delayMs) => {},
  },
});
```

## External Toggle Button

Use `buttonId` to wire an existing page element as the open/close trigger (sidebar and floating layouts):

```html
<button id="my-agent-btn">Ask AI</button>
<script>
  DeepgramAgent.init({
    tokenFactory,
    agent,
    buttonId: "my-agent-btn",
  });
</script>
```

You can also toggle programmatically:

```js
document.dispatchEvent(new Event("dg-agent-toggle"));
```

## Teardown

`init()` returns a cleanup function:

```js
const destroy = DeepgramAgent.init({ tokenFactory, agent });

// Later: unmount widget and clean up injected styles
destroy();
```

## Exports

```ts
export { init };
export type {
  WidgetConfig,
  WidgetTheme,
  WidgetTextContent,
  WidgetOverrides,
  WidgetCallbacks,
  WidgetLayout,
  WidgetPlacement,
  WidgetColorScheme,
};
```

## License

MIT
