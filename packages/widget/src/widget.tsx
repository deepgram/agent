import { useEffect, useState } from "preact/hooks";
import { useDeepgramAgent } from "@deepgram/agent-react";
import type { AgentSessionConfig } from "@deepgram/agent";
import { ConversationPanel } from "./components/ConversationPanel.js";
import type { WidgetConfig } from "./types.js";

interface WidgetProps {
  config: WidgetConfig;
}

function buildSessionConfig(config: WidgetConfig): AgentSessionConfig {
  if (!config.apiKey && !config.tokenFactory) {
    throw new Error(
      "[@deepgram/agent-widget] Either apiKey or tokenFactory is required",
    );
  }

  const base: AgentSessionConfig = {
    auth: config.apiKey
      ? { apiKey: config.apiKey }
      : { tokenFactory: config.tokenFactory! },
    agent: config.agent,
    audio: {
      input: { encoding: "linear16", sampleRate: 16_000 },
      output: {
        encoding: "linear16",
        sampleRate: config.playerSampleRate ?? 24_000,
      },
    },
  };

  // Apply overrides onto the agent settings if provided
  if (config.overrides && typeof base.agent === "object") {
    const agent = base.agent as Record<string, unknown>;
    if (config.overrides.greeting) agent.greeting = config.overrides.greeting;
    // systemPrompt override would require inspecting think.instructions/prompt;
    // kept as-is for now — full override support belongs in a future iteration
  }

  return base;
}

function placementClass(config: WidgetConfig): string {
  return config.placement ? `dg-va-${config.placement}` : "dg-va-bottom-right";
}

// ---------------------------------------------------------------------------
// Shared agent hook with callback wiring
// ---------------------------------------------------------------------------

function useWidgetAgent(config: WidgetConfig) {
  const agent = useDeepgramAgent({
    config: buildSessionConfig(config),
    micOptions: { vad: config.vad ?? false },
    playerSampleRate: config.playerSampleRate,
    onFunctionCall: config.on?.onFunctionCallRequest
      ? async (fn) => {
          // Surface to external handler; return empty string if no result
          config.on?.onFunctionCallRequest?.({ type: "FunctionCallRequest", functions: [fn] });
          return JSON.stringify({ ok: true });
        }
      : undefined,
  });

  // Wire SDK-level callbacks
  useEffect(() => {
    if (!config.on) return;
    const { onConnect, onDisconnect, onError, onMessage, onAgentStartedSpeaking, onAgentError, onReconnecting } = config.on;

    // We don't have direct access to the underlying AgentSession from the hook,
    // so we map lifecycle state changes to callbacks here.
    if (onConnect && agent.state === "connected") onConnect();
    if (onDisconnect && agent.state === "disconnected") onDisconnect("session ended");
  }, [agent.state]);

  return agent;
}

// ---------------------------------------------------------------------------
// Sidebar layout
// ---------------------------------------------------------------------------

export function SidebarWidget({ config }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const agent = useWidgetAgent(config);
  const pc = placementClass(config);

  return (
    <>
      <div
        class={`dg-va-overlay ${open ? "dg-va-open" : ""}`}
        onClick={() => config.dismissible !== false && setOpen(false)}
      />
      <div class={`dg-va-panel ${pc} ${open ? "dg-va-open" : ""}`}>
        <ConversationPanel
          config={config}
          state={agent.state}
          micActive={agent.micActive}
          outputMuted={agent.outputMuted}
          conversation={agent.conversation}
          onStart={agent.start}
          onStop={agent.stop}
          onMicMute={agent.setMicMuted}
          onOutputMute={agent.setOutputMuted}
          onSendText={agent.sendUserMessage}
          onClose={config.dismissible !== false ? () => setOpen(false) : undefined}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline layout
// ---------------------------------------------------------------------------

export function InlineWidget({ config }: WidgetProps) {
  const agent = useWidgetAgent(config);

  return (
    <ConversationPanel
      config={config}
      state={agent.state}
      micActive={agent.micActive}
      outputMuted={agent.outputMuted}
      conversation={agent.conversation}
      onStart={agent.start}
      onStop={agent.stop}
      onMicMute={agent.setMicMuted}
      onOutputMute={agent.setOutputMuted}
      onSendText={agent.sendUserMessage}
      inline
    />
  );
}

// ---------------------------------------------------------------------------
// Floating FAB layout
// ---------------------------------------------------------------------------

export function FloatingWidget({ config }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const agent = useWidgetAgent(config);
  const pc = placementClass(config);

  return (
    <>
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
          state={agent.state}
          micActive={agent.micActive}
          outputMuted={agent.outputMuted}
          conversation={agent.conversation}
          onStart={agent.start}
          onStop={agent.stop}
          onMicMute={agent.setMicMuted}
          onOutputMute={agent.setOutputMuted}
          onSendText={agent.sendUserMessage}
          onClose={config.dismissible !== false ? () => setOpen(false) : undefined}
        />
      </div>
    </>
  );
}
