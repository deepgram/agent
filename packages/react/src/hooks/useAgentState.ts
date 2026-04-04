import { useAgentContext } from "../context.js";
import type { AgentState } from "@deepgram/agent";

export interface UseAgentStateResult {
  state: AgentState;
  isIdle: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  isDisconnected: boolean;
  isActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

/** Connection state and lifecycle controls. */
export function useAgentState(): UseAgentStateResult {
  const { state, start, stop } = useAgentContext();
  return {
    state,
    isIdle:          state === "idle",
    isConnecting:    state === "connecting",
    isConnected:     state === "connected",
    isReconnecting:  state === "reconnecting",
    isDisconnected:  state === "disconnected",
    isActive:        state === "connected" || state === "connecting" || state === "reconnecting",
    start,
    stop,
  };
}
