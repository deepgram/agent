import { useAgentPlayer } from "../hooks/useAgentPlayer.js";

export interface AgentSpeakerButtonProps {
  className?: string;
  /** Content when speaker is on. */
  activeLabel?: unknown;
  /** Content when speaker is muted. */
  mutedLabel?: unknown;
  onClick?: () => void;
}

/**
 * Toggles audio playback mute.
 * Hidden (returns null) when the provider has tts={false}.
 *
 * When absent, audio plays automatically with no visible toggle.
 */
export function AgentSpeakerButton({
  className,
  activeLabel = "Mute speaker",
  mutedLabel  = "Unmute speaker",
  onClick,
}: AgentSpeakerButtonProps) {
  const { outputMuted, toggle, enabled } = useAgentPlayer();

  if (!enabled) return null;

  const label = outputMuted ? mutedLabel : activeLabel;

  return (
    <button
      className={className}
      data-agent-speaker-button
      data-state={outputMuted ? "muted" : "active"}
      aria-label={typeof label === "string" ? label : "Speaker"}
      aria-pressed={!outputMuted}
      onClick={() => { toggle(); onClick?.(); }}
    >
      {label as React.ReactNode}
    </button>
  );
}
