import { useAgentContext } from "../context.js";

export interface UseAgentPlayerResult {
  outputMuted: boolean;
  setOutputMuted: (muted: boolean) => void;
  toggle: () => void;
  /** false when tts={false} on the provider — audio is fully disabled */
  enabled: boolean;
}

/** Audio playback state and mute controls. */
export function useAgentPlayer(): UseAgentPlayerResult {
  const { outputMuted, setOutputMuted, ttsEnabled } = useAgentContext();
  return {
    outputMuted,
    setOutputMuted,
    toggle: () => setOutputMuted(!outputMuted),
    enabled: ttsEnabled,
  };
}
