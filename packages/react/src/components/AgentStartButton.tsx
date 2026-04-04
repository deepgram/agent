import { useState } from "react";
import { useAgentState } from "../hooks/useAgentState.js";

export interface AgentStartButtonProps {
  className?: string;
  /** Label when not connected. */
  startLabel?: unknown;
  /** Label while connecting. */
  connectingLabel?: unknown;
  /** Label when connected (clicking stops). */
  stopLabel?: unknown;
  /** Label while reconnecting (clicking stops). */
  reconnectingLabel?: unknown;
  onClick?: () => void;
}

/**
 * Start / stop button that reflects connection state.
 * Disabled while connecting; shows the reconnecting label while recovering.
 */
export function AgentStartButton({
  className,
  startLabel       = "Start",
  connectingLabel  = "Connecting…",
  stopLabel        = "Stop",
  reconnectingLabel = "Reconnecting…",
  onClick,
}: AgentStartButtonProps) {
  const { state, isActive, isConnecting, isReconnecting, start, stop } = useAgentState();
  const [starting, setStarting] = useState(false);

  async function handleClick() {
    if (isActive || isReconnecting) {
      stop();
    } else {
      setStarting(true);
      try { await start(); } finally { setStarting(false); }
    }
    onClick?.();
  }

  const label = (starting || isConnecting)
    ? connectingLabel
    : isReconnecting
    ? reconnectingLabel
    : isActive
    ? stopLabel
    : startLabel;

  return (
    <button
      className={className}
      data-agent-start-button
      data-state={state}
      disabled={starting || isConnecting}
      aria-label={typeof label === "string" ? label : "Start agent"}
      onClick={handleClick}
    >
      {label as React.ReactNode}
    </button>
  );
}
