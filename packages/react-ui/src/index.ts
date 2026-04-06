// Styled components — import styles.css for the built-in look:
//   import "@deepgram/agent-react-ui/styles.css";

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

// Re-export hooks and provider for convenience — consumers can use just this package
export {
  AgentProvider,
  useAgentContext,
  useAgentState,
  useAgentConversation,
  useAgentMicrophone,
  useAgentPlayer,
  useAgentSession,
} from "@deepgram/agent-react";

export type {
  AgentProviderProps,
  AgentContextValue,
  ConversationEntry,
  UseAgentStateResult,
  UseAgentConversationResult,
  UseAgentMicrophoneResult,
  UseAgentPlayerResult,
} from "@deepgram/agent-react";
