import { useEffect, useRef, useState } from "preact/hooks";
import type { ConversationEntry } from "@deepgram/agent-react";
import type { AgentState } from "@deepgram/agent";
import {
  MicIcon,
  MicOffIcon,
  SpeakerIcon,
  SpeakerOffIcon,
  SendIcon,
  CloseIcon,
  AgentIcon,
} from "./icons.js";
import type { WidgetConfig } from "../types.js";

interface ConversationPanelProps {
  config: WidgetConfig;
  state: AgentState;
  micActive: boolean;
  outputMuted: boolean;
  conversation: ConversationEntry[];
  onStart: () => Promise<void>;
  onStop: () => void;
  onMicMute: (muted: boolean) => void;
  onOutputMute: (muted: boolean) => void;
  onSendText: (text: string) => void;
  onClose?: () => void;
  inline?: boolean;
}

const STATUS_LABELS: Record<AgentState, string> = {
  idle: "not started",
  connecting: "connecting…",
  connected: "connected",
  reconnecting: "reconnecting…",
  disconnected: "disconnected",
};

const STATUS_CLASS: Record<AgentState, string> = {
  idle: "",
  connecting: "dg-va-connecting",
  connected: "dg-va-connected",
  reconnecting: "dg-va-connecting",
  disconnected: "dg-va-error",
};

export function ConversationPanel({
  config,
  state,
  micActive,
  outputMuted,
  conversation,
  onStart,
  onStop,
  onMicMute,
  onOutputMute,
  onSendText,
  onClose,
  inline = false,
}: ConversationPanelProps) {
  const [micMuted, setMicMuted] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showTranscript = config.showTranscript !== false;
  const isActive = state === "connected" || state === "connecting" || state === "reconnecting";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  function handleMicToggle() {
    const next = !micMuted;
    setMicMuted(next);
    onMicMute(next);
  }

  function handleOutputToggle() {
    onOutputMute(!outputMuted);
  }

  async function handleStartStop() {
    if (isActive) {
      onStop();
    } else {
      setStarting(true);
      try { await onStart(); } finally { setStarting(false); }
    }
  }

  function handleSend() {
    const text = textValue.trim();
    if (!text || !isActive) return;
    onSendText(text);
    setTextValue("");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div class={inline ? "dg-va-panel-inline" : undefined}>
      {/* Header */}
      <div class="dg-va-header">
        <AgentIcon class="dg-va-header-icon" width={28} height={28} />
        <span class="dg-va-header-name">{config.name ?? "Voice Agent"}</span>
        <div class="dg-va-status">
          <div class={`dg-va-status-dot ${STATUS_CLASS[state]}`} />
          <span>{STATUS_LABELS[state]}</span>
        </div>
        {onClose && (
          <button class="dg-va-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        )}
      </div>

      {/* Conversation */}
      {showTranscript && (
        <div class="dg-va-conversation" ref={scrollRef}>
          {conversation.length === 0 ? (
            <div class="dg-va-empty-state">
              <AgentIcon width={40} height={40} />
              <p>Press <strong>Start</strong> to begin the conversation</p>
            </div>
          ) : (
            conversation.map((entry) => (
              <div
                key={entry.id}
                class={`dg-va-message ${
                  entry.role === "user" ? "dg-va-message-user" : "dg-va-message-assistant"
                }`}
              >
                {entry.content}
              </div>
            ))
          )}
        </div>
      )}

      {/* Controls */}
      <div class="dg-va-controls">
        {isActive && (
          <div class="dg-va-control-row">
            <textarea
              class="dg-va-text-input"
              placeholder="Type a message…"
              rows={1}
              value={textValue}
              onInput={(e) => setTextValue((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
            />
            <button
              class={`dg-va-icon-btn ${micMuted ? "dg-va-muted" : micActive ? "dg-va-active" : ""}`}
              onClick={handleMicToggle}
              aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {micMuted ? (
                <MicOffIcon width={18} height={18} />
              ) : (
                <MicIcon width={18} height={18} />
              )}
            </button>
            <button
              class={`dg-va-icon-btn ${outputMuted ? "dg-va-muted" : ""}`}
              onClick={handleOutputToggle}
              aria-label={outputMuted ? "Unmute speaker" : "Mute speaker"}
            >
              {outputMuted ? (
                <SpeakerOffIcon width={18} height={18} />
              ) : (
                <SpeakerIcon width={18} height={18} />
              )}
            </button>
            <button
              class="dg-va-icon-btn"
              onClick={handleSend}
              disabled={!textValue.trim()}
              aria-label="Send"
            >
              <SendIcon width={18} height={18} />
            </button>
          </div>
        )}

        <button
          class={`dg-va-start-btn ${isActive ? "dg-va-stop" : ""}`}
          onClick={handleStartStop}
          disabled={starting || state === "connecting"}
        >
          {starting
            ? "Starting…"
            : isActive
            ? "Stop"
            : "Start"}
        </button>
      </div>
    </div>
  );
}
