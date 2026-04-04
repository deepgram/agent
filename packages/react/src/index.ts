export { AgentProvider, useAgentContext } from "./context.js";
export type { AgentProviderProps, AgentContextValue } from "./context.js";

export { useDeepgramAgent } from "./hooks/useDeepgramAgent.js";
export type {
  UseDeepgramAgentOptions,
  UseDeepgramAgentResult,
  ConversationEntry,
} from "./hooks/useDeepgramAgent.js";

// Re-export the SDK surface that React consumers need
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
