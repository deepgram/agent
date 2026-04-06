import { useAgentContext } from "../context.js";

export interface UseAgentPlayerResult {
  outputMuted: boolean;
  setOutputMuted: (muted: boolean) => void;
  toggle: () => void;
  /** false when tts={false} on the provider — audio is fully disabled */
  enabled: boolean;
  /** Current output volume (0–1). Call per frame for visualizers. */
  getOutputVolume: () => number;
}

/** Audio playback state, mute controls, and volume. */
export function useAgentPlayer(): UseAgentPlayerResult {
  const { outputMuted, setOutputMuted, ttsEnabled, getOutputVolume } = useAgentContext();
  return {
    outputMuted,
    setOutputMuted,
    toggle: () => setOutputMuted(!outputMuted),
    enabled: ttsEnabled,
    getOutputVolume,
  };
}
