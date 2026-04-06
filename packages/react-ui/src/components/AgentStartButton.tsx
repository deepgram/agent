import { useState } from "react";
import { useAgentState } from "@deepgram/agent-react";

export interface AgentStartButtonProps {
  className?: string;
  startLabel?: unknown;
  connectingLabel?: unknown;
  stopLabel?: unknown;
  reconnectingLabel?: unknown;
  onClick?: () => void;
}

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
