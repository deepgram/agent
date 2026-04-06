import {
  AgentStatus,
  AgentConversation,
  AgentTextInput,
  AgentMicrophoneButton,
  AgentSpeakerButton,
  AgentStartButton,
} from "@deepgram/agent-react-ui";
import { CloseIcon, AgentIcon, MicIcon, MicOffIcon, SpeakerIcon, SpeakerOffIcon, SendIcon } from "./icons.js";
import type { WidgetConfig } from "../types.js";

interface ConversationPanelProps {
  config: WidgetConfig;
  onClose?: () => void;
  inline?: boolean;
}

export function ConversationPanel({ config, onClose, inline = false }: ConversationPanelProps) {
  const agentName = config.text?.name ?? "Voice Agent";

  return (
    <div class={inline ? "dg-va-panel-inline" : undefined}>
      {/* Header */}
      <div class="dg-va-header">
        <AgentIcon class="dg-va-header-icon" width={28} height={28} />
        <span class="dg-va-header-name">{agentName}</span>
        <AgentStatus className="dg-va-status" />
        {onClose && (
          <button class="dg-va-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        )}
      </div>

      {/* Conversation transcript */}
      {config.showTranscript !== false && (
        <AgentConversation
          className="dg-va-conversation"
          emptyState={
            <div class="dg-va-empty-state">
              <AgentIcon width={40} height={40} />
              <p>{config.text?.emptyStateHint ?? "Press Start to begin the conversation"}</p>
            </div>
          }
        />
      )}

      {/* Controls */}
      <div class="dg-va-controls">
        <div class="dg-va-control-row">
          {config.showTextInput !== false && (
            <AgentTextInput
              className="dg-va-text-input-row"
              placeholder={config.text?.inputPlaceholder ?? "Type a message…"}
              submitButton={<SendIcon width={18} height={18} />}
            />
          )}

          {config.showMicToggle !== false && (
            <AgentMicrophoneButton
              className="dg-va-icon-btn"
              activeLabel={<MicIcon width={18} height={18} />}
              mutedLabel={<MicOffIcon width={18} height={18} />}
            />
          )}

          {config.showSpeakerToggle !== false && (
            <AgentSpeakerButton
              className="dg-va-icon-btn"
              activeLabel={<SpeakerIcon width={18} height={18} />}
              mutedLabel={<SpeakerOffIcon width={18} height={18} />}
            />
          )}
        </div>

        <AgentStartButton
          className="dg-va-start-btn"
          startLabel={config.text?.startLabel ?? "Start"}
          stopLabel={config.text?.stopLabel ?? "Stop"}
          connectingLabel={config.text?.connectingLabel ?? "Connecting…"}
        />
      </div>
    </div>
  );
}
