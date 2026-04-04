import { useState } from "preact/hooks";
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

  return {
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
}

// ---------------------------------------------------------------------------
// Sidebar layout
// ---------------------------------------------------------------------------

export function SidebarWidget({ config }: WidgetProps) {
  const [open, setOpen] = useState(false);
  const agent = useDeepgramAgent({
    config: buildSessionConfig(config),
    micOptions: {
      vad: config.vad ?? false,
    },
    playerSampleRate: config.playerSampleRate,
  });

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <div
        class={`dg-va-overlay ${open ? "dg-va-open" : ""}`}
        onClick={handleClose}
      />
      <div class={`dg-va-panel ${open ? "dg-va-open" : ""}`}>
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
          onClose={handleClose}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline layout
// ---------------------------------------------------------------------------

export function InlineWidget({ config }: WidgetProps) {
  const agent = useDeepgramAgent({
    config: buildSessionConfig(config),
    micOptions: { vad: config.vad ?? false },
    playerSampleRate: config.playerSampleRate,
  });

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
  const agent = useDeepgramAgent({
    config: buildSessionConfig(config),
    micOptions: { vad: config.vad ?? false },
    playerSampleRate: config.playerSampleRate,
  });

  return (
    <>
      <button
        class="dg-va-fab"
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
        onClick={() => setOpen(false)}
      />
      <div class={`dg-va-panel ${open ? "dg-va-open" : ""}`}>
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
          onClose={() => setOpen(false)}
        />
      </div>
    </>
  );
}
