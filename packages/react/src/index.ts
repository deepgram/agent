// Provider
export { AgentProvider } from "./provider.js";
export type { AgentProviderProps } from "./provider.js";

// Context (escape hatch)
export { useAgentContext } from "./context.js";
export type { AgentContextValue, ConversationEntry } from "./context.js";

// Focused hooks — use these in your own components
export { useAgentState }        from "./hooks/useAgentState.js";
export { useAgentConversation } from "./hooks/useAgentConversation.js";
export { useAgentMicrophone }   from "./hooks/useAgentMicrophone.js";
export { useAgentPlayer }       from "./hooks/useAgentPlayer.js";
export { useAgentSession }      from "./hooks/useAgentSession.js";
export type { UseAgentStateResult }        from "./hooks/useAgentState.js";
export type { UseAgentConversationResult } from "./hooks/useAgentConversation.js";
export type { UseAgentMicrophoneResult }   from "./hooks/useAgentMicrophone.js";
export type { UseAgentPlayerResult }       from "./hooks/useAgentPlayer.js";

// Pre-built components — compose these to build your UI
export { AgentStatus }           from "./components/AgentStatus.js";
export { AgentConversation }     from "./components/AgentConversation.js";
export { AgentTextInput }        from "./components/AgentTextInput.js";
export { AgentMicrophoneButton } from "./components/AgentMicrophoneButton.js";
export { AgentSpeakerButton }    from "./components/AgentSpeakerButton.js";
export { AgentStartButton }      from "./components/AgentStartButton.js";
export type { AgentStatusProps }           from "./components/AgentStatus.js";
export type { AgentConversationProps }     from "./components/AgentConversation.js";
export type { AgentTextInputProps }        from "./components/AgentTextInput.js";
export type { AgentMicrophoneButtonProps } from "./components/AgentMicrophoneButton.js";
export type { AgentSpeakerButtonProps }    from "./components/AgentSpeakerButton.js";
export type { AgentStartButtonProps }      from "./components/AgentStartButton.js";

// SDK types re-exported for convenience
export type {
  AgentSessionConfig,
  AuthConfig,
  TokenFactory,
  AgentSettingsObject,
  ThinkSettings,
  SpeakSettings,
  MicrophoneOptions,
  VadOptions,
} from "@deepgram/agent";
