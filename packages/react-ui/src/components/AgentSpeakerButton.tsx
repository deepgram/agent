import { useAgentPlayer } from "@deepgram/agent-react";

export interface AgentSpeakerButtonProps {
  className?: string;
  activeLabel?: unknown;
  mutedLabel?: unknown;
  onClick?: () => void;
}

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
