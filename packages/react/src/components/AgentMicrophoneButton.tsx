import { useAgentMicrophone } from "../hooks/useAgentMicrophone.js";

export interface AgentMicrophoneButtonProps {
  className?: string;
  /** Content when mic is active (unmuted). */
  activeLabel?: unknown;
  /** Content when mic is muted. */
  mutedLabel?: unknown;
  /** Content when mic is disabled (provider microphone={false}). */
  disabledLabel?: unknown;
  onClick?: () => void;
}

/**
 * Toggles the microphone mute state.
 * Hidden (returns null) when the provider has microphone={false}.
 *
 * Presence of this component is intentional — when it's absent, the mic
 * auto-opens on connect with no visible toggle.
 */
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
