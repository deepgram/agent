import type {
  AgentSettingsObject,
  MicrophoneOptions,
  ConversationTextMessage,
  AgentStartedSpeakingMessage,
  FunctionCallRequestMessage,
  AgentErrorMessage,
} from "@deepgram/agent";

export type TokenFactory = () => Promise<string>;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * - `sidebar`  — panel slides in from the right edge (default)
 * - `inline`   — mounts into a host container element
 * - `floating` — a FAB button reveals an overlay panel
 */
export type WidgetLayout = "sidebar" | "inline" | "floating";

/**
 * Where the FAB / panel anchor appears on screen.
 * Only applies to `sidebar` and `floating` layouts.
 */
export type WidgetPlacement =
  | "bottom-right"
  | "bottom-left"
  | "bottom"
  | "top-right"
  | "top-left"
  | "top";

// ---------------------------------------------------------------------------
// Color scheme
// ---------------------------------------------------------------------------

/**
 * Controls how the widget responds to light/dark mode.
 *
 * - `'auto'`  (default): follows `prefers-color-scheme` via CSS `light-dark()`
 * - `'light'` / `'dark'`: forces a specific scheme regardless of OS preference
 * - `{ mode: 'class', darkSelector, lightSelector }`: class-based — the widget
 *   watches for a CSS selector on any ancestor element, e.g. `.dark` or
 *   `[data-theme="dark"]`. Useful when the host app controls theme via a class
 *   on `<html>` or a layout element rather than OS preference.
 *
 * @example Class-based (Tailwind / next-themes style):
 * ```js
 * colorScheme: { mode: 'class', darkSelector: '.dark' }
 * ```
 *
 * @example Fixed dark:
 * ```js
 * colorScheme: 'dark'
 * ```
 */
export type WidgetColorScheme =
  | "auto"
  | "light"
  | "dark"
  | {
      mode: "class";
      /**
       * CSS selector that, when matched by any ancestor of the widget root,
       * activates dark mode. Default: `'.dark'`
       */
      darkSelector?: string;
      /**
       * CSS selector that, when matched by any ancestor, activates light mode.
       * Default: `'.light'`
       */
      lightSelector?: string;
    };

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

/**
 * Override specific design tokens. Each property maps to a CSS custom property
 * on the widget root element (`[data-dg-agent]`).
 *
 * Because the built-in values use `var(--dg-va-TOKEN, light-dark(…, …))`, any
 * property you set here wins over the built-in adaptive defaults in both modes.
 * To override only one mode, omit this and write CSS instead:
 * ```css
 * @media (prefers-color-scheme: dark) {
 *   [data-dg-agent] { --dg-va-bg: #0d1117; }
 * }
 * ```
 */
export interface WidgetTheme {
  /** Brand/accent colour. Default adapts: same green (#13EF93) on both modes */
  primary?: string;
  /** Panel background */
  background?: string;
  /** Raised element background (message bubbles, input) */
  backgroundRaised?: string;
  /** Input field background */
  backgroundInput?: string;
  /** Primary text colour */
  text?: string;
  /** Muted/secondary text colour */
  textMuted?: string;
  /** Widget border colour */
  border?: string;
  /** Error/destructive colour */
  error?: string;
  /** Button border radius. Default: 10px */
  buttonRadius?: string;
  /** Panel border radius. Default: 16px */
  panelRadius?: string;
  /** FAB button size in px. Default: 56 */
  fabSize?: number;
}

// ---------------------------------------------------------------------------
// Text content overrides
// ---------------------------------------------------------------------------

export interface WidgetTextContent {
  /** Panel header / agent display name. Default: "Voice Agent" */
  name?: string;
  /** Start button label. Default: "Start" */
  startLabel?: string;
  /** Stop button label. Default: "Stop" */
  stopLabel?: string;
  /** While connecting. Default: "Starting…" */
  connectingLabel?: string;
  /** Text input placeholder. Default: "Type a message…" */
  inputPlaceholder?: string;
  /** Empty transcript state. Default: "Press Start to begin the conversation" */
  emptyStateHint?: string;
}

// ---------------------------------------------------------------------------
// Runtime overrides (applied at connect time without changing the base agent)
// ---------------------------------------------------------------------------

export interface WidgetOverrides {
  /** Override the agent's system prompt for this session */
  systemPrompt?: string;
  /** Override the agent's greeting message */
  greeting?: string;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

export interface WidgetCallbacks {
  /** Fired when the WebSocket connection opens */
  onConnect?: () => void;
  /** Fired when the session ends (user or server side) */
  onDisconnect?: (reason: string) => void;
  /** Fired on any SDK-level error */
  onError?: (err: Error) => void;
  /** Fired on every conversation turn (user or assistant text) */
  onMessage?: (msg: ConversationTextMessage) => void;
  /** Fired when the agent starts speaking, includes latency metrics */
  onAgentStartedSpeaking?: (msg: AgentStartedSpeakingMessage) => void;
  /** Fired when the agent requests a client-side function call */
  onFunctionCallRequest?: (msg: FunctionCallRequestMessage) => void;
  /** Fired on agent-reported errors (distinct from SDK errors) */
  onAgentError?: (msg: AgentErrorMessage) => void;
  /** Fired on every reconnect attempt */
  onReconnecting?: (attempt: number, delayMs: number) => void;
}

// ---------------------------------------------------------------------------
// Main config
// ---------------------------------------------------------------------------

export interface WidgetConfig {
  // ---- Auth (one of these required) ----

  /** Deepgram API key — fine for dev/server-side. Use tokenFactory for browser. */
  apiKey?: string;
  /**
   * Async factory called at connect time and before every reconnect.
   * Return a short-lived Deepgram API key from your backend.
   */
  tokenFactory?: TokenFactory;

  // ---- Agent ----

  /** Full agent settings object or pre-built agent UUID from the Deepgram console. */
  agent: AgentSettingsObject | string;

  /**
   * Per-session overrides applied on top of the base agent config.
   * Use to personalise the prompt or greeting without changing the agent.
   */
  overrides?: WidgetOverrides;

  // ---- Layout ----

  /**
   * Widget mount strategy.
   * - `sidebar`  — slides in from the right edge (default)
   * - `inline`   — mounts into `containerId`
   * - `floating` — FAB button reveals an overlay panel
   */
  layout?: WidgetLayout;

  /**
   * Where the widget anchors on screen (sidebar and floating only).
   * Default: `bottom-right`
   */
  placement?: WidgetPlacement;

  /** ID of the host element for `inline` layout */
  containerId?: string;

  /**
   * ID of an existing button element that toggles the panel open/closed.
   * When set, the built-in FAB is hidden and this button drives open/close.
   * Applies to `sidebar` and `floating` layouts.
   */
  buttonId?: string;

  /** Start the panel open (sidebar/floating only). Default: false */
  defaultOpen?: boolean;

  /** Allow the user to close/dismiss the panel. Default: true */
  dismissible?: boolean;

  // ---- Features ----

  /**
   * Enable Silero VAD via @ricky0123/vad-web (optional peer dep).
   * When `true`, audio is gated — only speech frames are sent to the agent.
   * Default: false
   */
  vad?: boolean | MicrophoneOptions["vad"];

  /** Show conversation transcript. Default: true */
  showTranscript?: boolean;

  /** Show microphone mute toggle. Default: true */
  showMicToggle?: boolean;

  /** Show speaker/output mute toggle. Default: true */
  showSpeakerToggle?: boolean;

  /** Show the text input field. Default: true */
  showTextInput?: boolean;

  // ---- Text content ----

  /** Override any of the built-in UI labels */
  text?: WidgetTextContent;

  // ---- Colour scheme ----

  /**
   * How the widget responds to light/dark mode.
   * Default: `'auto'` — follows `prefers-color-scheme` via CSS `light-dark()`.
   *
   * Set to `'dark'` or `'light'` to force a mode, or pass `{ mode: 'class' }`
   * to mirror the host app's class-based theme (e.g. Tailwind, next-themes).
   */
  colorScheme?: WidgetColorScheme;

  // ---- Styling ----

  /**
   * Override individual design tokens. Each key maps to a CSS custom property
   * set on the widget root, overriding the built-in `light-dark()` defaults.
   */
  theme?: WidgetTheme;

  // ---- Callbacks ----

  /** Event callbacks — use for analytics, custom logging, or UI integration */
  on?: WidgetCallbacks;

  // ---- Audio ----

  /** Sample rate of audio received from the agent. Default: 24_000 */
  playerSampleRate?: number;
}
