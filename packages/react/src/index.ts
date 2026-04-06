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

// Standalone hook — no provider needed
export { useDeepgramAgent } from "./hooks/useDeepgramAgent.js";

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
