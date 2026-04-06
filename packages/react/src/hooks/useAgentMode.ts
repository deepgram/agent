import { useAgentContext, type AgentMode } from "../context.js";

export interface UseAgentModeResult {
  mode: AgentMode;
  isSpeaking: boolean;
  isListening: boolean;
}

/**
 * Agent speaking/listening mode.
 * - `"idle"` — not connected
 * - `"listening"` — agent is listening for user speech
 * - `"speaking"` — agent is producing audio
 */
export function useAgentMode(): UseAgentModeResult {
  const { mode, isSpeaking, isListening } = useAgentContext();
  return { mode, isSpeaking, isListening };
}
