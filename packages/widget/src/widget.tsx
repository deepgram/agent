import { AgentProvider, useAgentState, useAgentMode, useAgentMicrophone, useAgentPlayer } from "@deepgram/agent-react";
import type { AgentSessionConfig } from "@deepgram/agent";
import { Orb } from "@deepgram/agent-react-ui";
import { ConversationPanel } from "./components/ConversationPanel.js";
import type { WidgetConfig } from "./types.js";

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
  return config.placement ? `dg-va-${config.placement}` : "dg-va-bottom-right";
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function SidebarWidget({ config, onToggle }: WidgetProps & { onToggle?: () => void }) {
  const pc = placementClass(config);

  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
      onFunctionCall={config.on?.onFunctionCallRequest
        ? async (fn) => { config.on!.onFunctionCallRequest!({ type: "FunctionCallRequest", functions: [fn] }); return JSON.stringify({ ok: true }); }
        : undefined}
    >
      <div
        class="dg-va-overlay"
        onClick={() => config.dismissible !== false && onToggle?.()}
      />
      <div class={`dg-va-panel ${pc}`}>
        <ConversationPanel
          config={config}
          onClose={config.dismissible !== false ? onToggle : undefined}
        />
      </div>
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

export function InlineWidget({ config }: WidgetProps) {
  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
    >
      <ConversationPanel config={config} inline />
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// Floating FAB
// ---------------------------------------------------------------------------

export function FloatingWidget({ config, onToggle }: WidgetProps & { onToggle?: () => void }) {
  const pc = placementClass(config);

  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
    >
      <button
        class={`dg-va-fab ${pc}`}
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
        class="dg-va-overlay"
        onClick={() => config.dismissible !== false && onToggle?.()}
      />
      <div class={`dg-va-panel ${pc}`}>
        <ConversationPanel
          config={config}
          onClose={config.dismissible !== false ? onToggle : undefined}
        />
      </div>
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// Embedded — fills container width, aspect-ratio height, includes chat
// ---------------------------------------------------------------------------

export function EmbeddedWidget({ config }: WidgetProps) {
  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
      onFunctionCall={config.on?.onFunctionCallRequest
        ? async (fn) => { config.on!.onFunctionCallRequest!({ type: "FunctionCallRequest", functions: [fn] }); return JSON.stringify({ ok: true }); }
        : undefined}
    >
      <ConversationPanel config={config} inline />
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// Button — single "talk to agent" button, no panel
// ---------------------------------------------------------------------------

function AgentButton({ config }: WidgetProps) {
  const { state, isActive, isConnecting, start, stop } = useAgentState();

  const idle = state === "idle" || state === "disconnected";
  const live = state === "connected";

  const label = isConnecting
    ? (config.text?.connectingLabel ?? "Connecting…")
    : isActive
    ? (config.text?.stopLabel ?? "End conversation")
    : (config.text?.startLabel ?? "Talk to our agent");

  async function handleClick() {
    if (isActive) {
      stop();
    } else {
      await start();
    }
  }

  return (
    <button
      class={`dg-va-agent-btn ${live ? "dg-va-agent-btn-live" : ""}`}
      data-state={state}
      disabled={isConnecting}
      aria-label={label}
      onClick={handleClick}
    >
      {live && <span class="dg-va-agent-btn-dot" />}
      <svg class="dg-va-agent-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {idle ? (
          <>
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </>
        ) : (
          <>
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </>
        )}
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function ButtonWidget({ config }: WidgetProps) {
  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
      tts={true}
      onFunctionCall={config.on?.onFunctionCallRequest
        ? async (fn) => { config.on!.onFunctionCallRequest!({ type: "FunctionCallRequest", functions: [fn] }); return JSON.stringify({ ok: true }); }
        : undefined}
    >
      <AgentButton config={config} />
    </AgentProvider>
  );
}

// ---------------------------------------------------------------------------
// Orb — animated hoop with start/stop, audio-reactive
// ---------------------------------------------------------------------------

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
    if (isActive) {
      stop();
    } else {
      await start();
    }
  }

  return (
    <div class="dg-va-orb-layout" data-state={state}>
      <Orb
        state={orbState}
        getInputVolume={getInputVolume}
        getOutputVolume={getOutputVolume}
        size={config.theme?.fabSize ?? 180}
      />
      <span class="dg-va-orb-status" data-state={state} aria-live="polite">
        {orbState === "talking" ? "Agent speaking" : orbState === "listening" ? "Listening…" : ""}
      </span>
      <button
        class={`dg-va-orb-btn ${isActive ? "dg-va-orb-btn-active" : ""}`}
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
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
      tts={true}
      onFunctionCall={config.on?.onFunctionCallRequest
        ? async (fn) => { config.on!.onFunctionCallRequest!({ type: "FunctionCallRequest", functions: [fn] }); return JSON.stringify({ ok: true }); }
        : undefined}
    >
      <OrbView config={config} />
    </AgentProvider>
  );
}
