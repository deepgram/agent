import type {
  WelcomeMessage,
  SettingsAppliedMessage,
  ConversationTextMessage,
  UserStartedSpeakingMessage,
  AgentThinkingMessage,
  FunctionCallRequestMessage,
  AgentStartedSpeakingMessage,
  AgentAudioDoneMessage,
  PromptUpdatedMessage,
  SpeakUpdatedMessage,
  ThinkUpdatedMessage,
  InjectionRefusedMessage,
  AgentErrorMessage,
  AgentWarningMessage,
  FunctionCallResponseMessage,
} from "./messages.js";

/**
 * Typed event map for AgentSession.
 * Keys are the event names; values are the argument tuples passed to listeners.
 */
export interface AgentSessionEvents {
  // Server → client (JSON)
  welcome: [msg: WelcomeMessage];
  "settings-applied": [msg: SettingsAppliedMessage];
  "conversation-text": [msg: ConversationTextMessage];
  "user-started-speaking": [msg: UserStartedSpeakingMessage];
  "agent-thinking": [msg: AgentThinkingMessage];
  "function-call-request": [msg: FunctionCallRequestMessage];
  "agent-started-speaking": [msg: AgentStartedSpeakingMessage];
  "agent-audio-done": [msg: AgentAudioDoneMessage];
  "prompt-updated": [msg: PromptUpdatedMessage];
  "speak-updated": [msg: SpeakUpdatedMessage];
  "think-updated": [msg: ThinkUpdatedMessage];
  "injection-refused": [msg: InjectionRefusedMessage];
  error: [msg: AgentErrorMessage];
  warning: [msg: AgentWarningMessage];
  "function-call-response": [msg: FunctionCallResponseMessage];

  // Server → client (binary) — may be ArrayBuffer or Blob depending on WebSocket binaryType
  audio: [chunk: ArrayBuffer | Blob];

  // SDK lifecycle events
  connecting: [];
  connected: [];
  reconnecting: [attempt: number, delayMs: number];
  disconnected: [reason: string];
  "sdk-error": [err: Error];
}
