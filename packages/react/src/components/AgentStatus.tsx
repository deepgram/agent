import { useAgentState } from "../hooks/useAgentState.js";

export interface AgentStatusProps {
  className?: string;
  /** Custom label map. Defaults to human-readable strings for each state. */
  labels?: Partial<Record<string, string>>;
}

const DEFAULT_LABELS: Record<string, string> = {
  idle:          "Not started",
  connecting:    "Connecting…",
  connected:     "Connected",
  reconnecting:  "Reconnecting…",
  disconnected:  "Disconnected",
};

/**
 * Renders the current connection state as a labelled indicator.
 * Adds a `data-state` attribute for CSS targeting.
 */
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
