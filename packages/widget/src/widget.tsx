import { useState } from "preact/hooks";
import { AgentProvider } from "@deepgram/agent-react";
import type { AgentSessionConfig } from "@deepgram/agent";
import { ConversationPanel } from "./components/ConversationPanel.js";
import type { WidgetConfig } from "./types.js";

interface WidgetProps {
  config: WidgetConfig;
}

function buildSessionConfig(config: WidgetConfig): AgentSessionConfig {
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
  };
}

function placementClass(config: WidgetConfig): string {
  return config.placement ? `dg-va-${config.placement}` : "dg-va-bottom-right";
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function SidebarWidget({ config }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const pc = placementClass(config);

  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphone={config.vad !== undefined ? true : config.vad ?? true}
      microphoneOptions={{ vad: config.vad ?? false }}
      tts={config.playerSampleRate !== undefined ? true : true}
      playerSampleRate={config.playerSampleRate}
      onFunctionCall={config.on?.onFunctionCallRequest
        ? async (fn) => { config.on!.onFunctionCallRequest!({ type: "FunctionCallRequest", functions: [fn] }); return JSON.stringify({ ok: true }); }
        : undefined}
    >
      <div
        class={`dg-va-overlay ${open ? "dg-va-open" : ""}`}
        onClick={() => config.dismissible !== false && setOpen(false)}
      />
      <div class={`dg-va-panel ${pc} ${open ? "dg-va-open" : ""}`}>
        <ConversationPanel
          config={config}
          onClose={config.dismissible !== false ? () => setOpen(false) : undefined}
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

export function FloatingWidget({ config }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const pc = placementClass(config);

  return (
    <AgentProvider
      config={buildSessionConfig(config)}
      microphoneOptions={{ vad: config.vad ?? false }}
      playerSampleRate={config.playerSampleRate}
    >
      <button
        class={`dg-va-fab ${pc}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open voice agent"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>
      <div
        class={`dg-va-overlay ${open ? "dg-va-open" : ""}`}
        onClick={() => config.dismissible !== false && setOpen(false)}
      />
      <div class={`dg-va-panel ${pc} ${open ? "dg-va-open" : ""}`}>
        <ConversationPanel
          config={config}
          onClose={config.dismissible !== false ? () => setOpen(false) : undefined}
        />
      </div>
    </AgentProvider>
  );
}
