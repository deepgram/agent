import { AgentProvider, useAgentState, useAgentMode, useAgentMicrophone, useAgentPlayer } from "@deepgram/react";
import type { AgentSessionConfig, FunctionCallItem } from "@deepgram/agent";
import { Orb } from "@deepgram/ui";
import { ConversationPanel } from "./components/ConversationPanel.js";
import type { WidgetConfig } from "./types.js";

// Preact VNode ≠ React ReactNode — suppress at the Preact/React boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Provider = AgentProvider as any;

interface WidgetProps {
  config: WidgetConfig;
}

export function buildSessionConfig(config: WidgetConfig): AgentSessionConfig {
  if (!config.apiKey && !config.tokenFactory) {
    throw new Error("[@deepgram/agent-widget] Either apiKey or tokenFactory is required");
  }
  return {
    auth: config.apiKey
      ? { apiKey: config.apiKey }
      : { tokenFactory: config.tokenFactory! },
    agent: config.agent,
    audio: {
      input:  { encoding: "linear16", sampleRate: 16_000 },
      output: { encoding: "linear16", sampleRate: config.playerSampleRate ?? 24_000 },
    },
    ...(config.url ? { url: config.url } : {}),
  };
}

function placementClass(config: WidgetConfig): string {
  const p = config.placement ?? "bottom-right";
  return `dg-fab-${p}`;
}

function panelPlacementClass(config: WidgetConfig): string {
  const p = config.placement ?? "bottom-right";
  return p.includes("left") ? "dg-panel-left" : "";
}

function providerProps(config: WidgetConfig) {
  return {
    config: buildSessionConfig(config),
    microphoneOptions: {},
    playerSampleRate: config.playerSampleRate,
    onFunctionCall: config.on?.onFunctionCallRequest
      ? async (fn: FunctionCallItem) => {
          config.on!.onFunctionCallRequest!({ type: "FunctionCallRequest", functions: [fn] });
          return JSON.stringify({ ok: true });
        }
      : undefined,
  };
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

export function SidebarWidget({ config, onToggle }: WidgetProps & { onToggle?: () => void }) {
  return (
    <Provider {...providerProps(config)}>
      <div
        class="dg-overlay"
        onClick={() => config.dismissible !== false && onToggle?.()}
      />
      <div class={`dg-panel ${panelPlacementClass(config)}`}>
        <ConversationPanel
          config={config}
          onClose={config.dismissible !== false ? onToggle : undefined}
        />
      </div>
    </Provider>
  );
}

// ── Inline ───────────────────────────────────────────────────────────────────

export function InlineWidget({ config }: WidgetProps) {
  return (
    <Provider {...providerProps(config)}>
      <ConversationPanel config={config} />
    </Provider>
  );
}

// ── Floating FAB ─────────────────────────────────────────────────────────────

export function FloatingWidget({ config, onToggle }: WidgetProps & { onToggle?: () => void }) {
  return (
    <Provider {...providerProps(config)}>
      <button
        class={`dg-fab ${placementClass(config)}`}
        onClick={() => onToggle?.()}
        aria-label="Open voice agent"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>
      <div
        class="dg-overlay"
        onClick={() => config.dismissible !== false && onToggle?.()}
      />
      <div class={`dg-panel ${panelPlacementClass(config)}`}>
        <ConversationPanel
          config={config}
          onClose={config.dismissible !== false ? onToggle : undefined}
        />
      </div>
    </Provider>
  );
}

// ── Embedded ─────────────────────────────────────────────────────────────────

export function EmbeddedWidget({ config }: WidgetProps) {
  return (
    <Provider {...providerProps(config)}>
      <ConversationPanel config={config} />
    </Provider>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────

function AgentButton({ config }: WidgetProps) {
  const { state, isActive, isConnecting, start, stop } = useAgentState();

  const label = isConnecting
    ? (config.text?.connectingLabel ?? "Connecting…")
    : isActive
    ? (config.text?.stopLabel ?? "End conversation")
    : (config.text?.startLabel ?? "Talk to our agent");

  async function handleClick() {
    if (isActive) { stop(); } else { await start(); }
  }

  return (
    <button
      class={[
        "dg-btn",
        isActive ? "dg-btn--active" : "",
        isConnecting ? "dg-btn--connecting" : "",
      ].filter(Boolean).join(" ")}
      data-state={state}
      disabled={isConnecting}
      aria-label={label}
      onClick={handleClick}
    >
      {isActive && (
        <span class="dg-btn__pulse" />
      )}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {!isActive ? (
          <>
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </>
        ) : (
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        )}
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function ButtonWidget({ config }: WidgetProps) {
  return (
    <Provider {...providerProps(config)} tts={true}>
      <AgentButton config={config} />
    </Provider>
  );
}

// ── Orb ──────────────────────────────────────────────────────────────────────

function OrbView({ config }: WidgetProps) {
  const { state, isActive, isConnecting, start, stop } = useAgentState();
  const { mode } = useAgentMode();
  const { getInputVolume } = useAgentMicrophone();
  const { getOutputVolume } = useAgentPlayer();

  const orbState = mode === "speaking" ? "talking" as const
    : mode === "listening" ? "listening" as const
    : "idle" as const;

  const label = isConnecting
    ? (config.text?.connectingLabel ?? "Connecting…")
    : isActive
    ? (config.text?.stopLabel ?? "End conversation")
    : (config.text?.startLabel ?? "Talk to our agent");

  async function handleClick() {
    if (isActive) { stop(); } else { await start(); }
  }

  return (
    <div class="dg-orb-view" data-state={state}>
      <Orb
        state={orbState}
        getInputVolume={getInputVolume}
        getOutputVolume={getOutputVolume}
        size={config.theme?.fabSize ?? 180}
      />
      <span class="dg-orb-view__status" data-state={state} aria-live="polite">
        {orbState === "talking" ? "Agent speaking" : orbState === "listening" ? "Listening…" : ""}
      </span>
      <button
        class={[
          "dg-btn",
          isActive ? "dg-btn--active" : "",
          isConnecting ? "dg-btn--connecting" : "",
        ].filter(Boolean).join(" ")}
        disabled={isConnecting}
        aria-label={label}
        onClick={handleClick}
      >
        {label}
      </button>
    </div>
  );
}

export function OrbWidget({ config }: WidgetProps) {
  return (
    <Provider {...providerProps(config)} tts={true}>
      <OrbView config={config} />
    </Provider>
  );
}
