import {
  AgentStatus,
  AgentConversation,
  AgentMessage,
  AgentTextInput,
  AgentMicrophoneButton,
  AgentSpeakerButton,
  AgentStartButton,
  useAgentConversation,
} from "@deepgram/ui";
import { CloseIcon, AgentIcon, MicIcon, MicOffIcon, SpeakerIcon, SpeakerOffIcon, SendIcon } from "./icons.js";
import type { WidgetConfig } from "../types.js";

interface ConversationPanelProps {
  config: WidgetConfig;
  onClose?: () => void;
}

export function ConversationPanel({ config, onClose }: ConversationPanelProps) {
  const agentName = config.text?.name ?? "Voice Agent";
  const { conversation } = useAgentConversation();

  return (
    // Fills .dg-panel (fixed, full height) or .dg-panel-inline (relative, flex-1)
    // This div IS the flex column — header + scrollable content + controls
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        borderBottom: "1px solid var(--color-border)",
        flexShrink: 0,
        backgroundColor: "var(--color-background)",
      }}>
        <AgentIcon
          style={{ width: 28, height: 28, flexShrink: 0, color: "var(--color-primary, #13ef93)" }}
          width={28} height={28}
        />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--color-foreground)" }}>
          {agentName}
        </span>
        <AgentStatus className="text-xs text-muted-foreground" />
        {onClose && (
          <button
            style={{
              width: 32, height: 32, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: "none", background: "none",
              color: "var(--color-muted-foreground)", cursor: "pointer",
            }}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </div>

      {/* ── Conversation — flex-1, scrolls ── */}
      {config.showTranscript !== false && (
        <AgentConversation className="flex-1 min-h-0">
          {(conversation.length === 0 ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 10, padding: 32, textAlign: "center",
              color: "var(--color-muted-foreground)", fontSize: 14,
            }}>
              <AgentIcon width={40} height={40} style={{ opacity: 0.3 }} />
              <p>{config.text?.emptyStateHint ?? "Press Start to begin the conversation"}</p>
            </div>
          ) : (
            conversation.map((entry) => (
              <AgentMessage key={entry.id} entry={entry} />
            ))
          )) as any}
        </AgentConversation>
      )}

      {/* ── Controls — pinned to bottom ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 16px",
        borderTop: "1px solid var(--color-border)",
        flexShrink: 0,
        backgroundColor: "var(--color-background)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {config.showTextInput !== false && (
            <AgentTextInput
              className="flex-1"
              placeholder={config.text?.inputPlaceholder ?? "Type a message…"}
              submitButton={<SendIcon width={16} height={16} /> as any}
            />
          )}
          {config.showMicToggle !== false && (
            <AgentMicrophoneButton
              activeLabel={<MicIcon width={18} height={18} /> as any}
              mutedLabel={<MicOffIcon width={18} height={18} /> as any}
            />
          )}
          {config.showSpeakerToggle !== false && (
            <AgentSpeakerButton
              activeLabel={<SpeakerIcon width={18} height={18} /> as any}
              mutedLabel={<SpeakerOffIcon width={18} height={18} /> as any}
            />
          )}
        </div>
        <AgentStartButton
          className="w-full"
          startLabel={config.text?.startLabel ?? "Start"}
          stopLabel={config.text?.stopLabel ?? "Stop"}
          connectingLabel={config.text?.connectingLabel ?? "Connecting…"}
        />
      </div>

    </div>
  );
}
