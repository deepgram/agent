import { useAgentContext } from "../context.js";

export interface UseAgentMicrophoneResult {
  /** Whether the microphone hardware is currently open */
  micActive: boolean;
  /** Whether the mic is muted (open but not sending audio) */
  micMuted: boolean;
  setMicMuted: (muted: boolean) => void;
  toggle: () => void;
  /** false when microphone={false} on the provider — mic is fully disabled */
  enabled: boolean;
}

/** Microphone state and mute controls. */
export function useAgentMicrophone(): UseAgentMicrophoneResult {
  const { micActive, micMuted, setMicMuted, micEnabled } = useAgentContext();
  return {
    micActive,
    micMuted,
    setMicMuted,
    toggle: () => setMicMuted(!micMuted),
    enabled: micEnabled,
  };
}
