export { AgentSession } from "./agent-session.js";
export type { AgentState } from "./agent-session.js";

export { AgentMicrophone } from "./audio/microphone.js";
export type { MicrophoneOptions } from "./audio/microphone.js";

export { AgentPlayer } from "./audio/player.js";
export type { PlayerOptions } from "./audio/player.js";

export type { AgentSessionConfig, AuthConfig, TokenFactory, ReconnectConfig } from "./types/config.js";
export type { AgentSessionEvents } from "./types/events.js";

export type {
  // Settings types (derived from / re-exported from @deepgram/sdk)
  AgentSettingsObject,
  AgentContextMessage,
  AgentV1SettingsPayload,
  ThinkSettings,
  ThinkProvider,
  SpeakSettings,
  SpeakProvider,
  AudioEncoding,
  OutputEncoding,
  // Server message types
  WelcomeMessage,
  SettingsAppliedMessage,
  ConversationTextMessage,
  UserStartedSpeakingMessage,
  AgentThinkingMessage,
  FunctionCallRequestMessage,
  FunctionCallItem,
  AgentStartedSpeakingMessage,
  AgentAudioDoneMessage,
  AgentErrorMessage,
  AgentWarningMessage,
  InjectionRefusedMessage,
  ServerMessage,
} from "./types/messages.js";
