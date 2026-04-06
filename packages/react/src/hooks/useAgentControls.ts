import { useAgentContext } from "../context.js";

export interface UseAgentControlsResult {
  start: () => Promise<void>;
  stop: () => void;
  sendUserMessage: (text: string) => void;
  clearConversation: () => void;
  setMicMuted: (muted: boolean) => void;
  setOutputMuted: (muted: boolean) => void;
}

/**
 * Stable action methods — all are useCallback-wrapped refs that never
 * change identity. Components using only this hook will never re-render
 * due to state changes.
 *
 * Use this in components that trigger actions but don't display state
 * (e.g. a custom "mute all" button).
 */
export function useAgentControls(): UseAgentControlsResult {
  const {
    start,
    stop,
    sendUserMessage,
    clearConversation,
    setMicMuted,
    setOutputMuted,
  } = useAgentContext();

  return {
    start,
    stop,
    sendUserMessage,
    clearConversation,
    setMicMuted,
    setOutputMuted,
  };
}
