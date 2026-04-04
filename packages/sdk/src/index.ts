export { AgentSession } from "./agent-session.js";
export type { AgentState } from "./agent-session.js";

export { AgentMicrophone } from "./audio/microphone.js";
export type { MicrophoneOptions, VadOptions } from "./audio/microphone.js";

export { AgentPlayer } from "./audio/player.js";
export type { PlayerOptions } from "./audio/player.js";

export type { AgentSessionConfig, AuthConfig, TokenFactory, ReconnectConfig } from "./types/config.js";
export type { AgentSessionEvents } from "./types/events.js";
export type {
  // Settings types
  AgentSettingsObject,
  ThinkSettings,
  ThinkProvider,
  ThinkProviderOpenAI,
  ThinkProviderAnthropic,
  ThinkProviderGoogle,
  ThinkProviderGroq,
  ThinkProviderAWSBedrock,
  SpeakSettings,
  SpeakProvider,
  SpeakProviderDeepgram,
  ListenProvider,
  ListenProviderDeepgramV1,
  ListenProviderDeepgramV2,
  FunctionDefinition,
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
