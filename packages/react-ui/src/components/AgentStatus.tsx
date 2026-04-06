import { useAgentState } from "@deepgram/agent-react";

export interface AgentStatusProps {
  className?: string;
  labels?: Partial<Record<string, string>>;
}

const DEFAULT_LABELS: Record<string, string> = {
  idle:          "Not started",
  connecting:    "Connecting…",
  connected:     "Connected",
  reconnecting:  "Reconnecting…",
  disconnected:  "Disconnected",
};

export function AgentStatus({ className, labels }: AgentStatusProps) {
  const { state } = useAgentState();
  const label = { ...DEFAULT_LABELS, ...labels }[state] ?? state;
  return (
    <span
      className={className}
      data-agent-status
      data-state={state}
      aria-live="polite"
      aria-label={`Agent status: ${label}`}
    >
      {label}
    </span>
  );
}
