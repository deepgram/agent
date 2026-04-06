import { useAgentMicrophone } from "@deepgram/agent-react";

export interface AgentMicrophoneButtonProps {
  className?: string;
  activeLabel?: unknown;
  mutedLabel?: unknown;
  disabledLabel?: unknown;
  onClick?: () => void;
}

export function AgentMicrophoneButton({
  className,
  activeLabel  = "Mute mic",
  mutedLabel   = "Unmute mic",
  disabledLabel,
  onClick,
}: AgentMicrophoneButtonProps) {
  const { micMuted, micActive, toggle, enabled } = useAgentMicrophone();

  if (!enabled) {
    return disabledLabel ? (
      <span className={className} data-agent-mic-button data-state="disabled" aria-disabled>
        {disabledLabel as React.ReactNode}
      </span>
    ) : null;
  }

  const label = micMuted ? mutedLabel : activeLabel;
  const state = !micActive ? "inactive" : micMuted ? "muted" : "active";

  return (
    <button
      className={className}
      data-agent-mic-button
      data-state={state}
      aria-label={typeof label === "string" ? label : "Microphone"}
      aria-pressed={!micMuted}
      onClick={() => { toggle(); onClick?.(); }}
    >
      {label as React.ReactNode}
    </button>
  );
}
