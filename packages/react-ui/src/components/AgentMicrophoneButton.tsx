import { useAgentMicrophone } from "@deepgram/agent-react";

export interface AgentMicrophoneButtonProps {
  className?: string;
  activeLabel?: unknown;
  mutedLabel?: unknown;
  disabledLabel?: unknown;
  onClick?: () => void;
}

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);
const MicOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

export function AgentMicrophoneButton({
  className,
  activeLabel  = <MicIcon />,
  mutedLabel   = <MicOffIcon />,
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
