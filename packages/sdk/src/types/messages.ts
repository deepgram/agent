/**
 * All types are derived from or re-exported from @deepgram/sdk.
 * No hand-written API type definitions live here.
 */
import type { DeepgramClient, agent } from "@deepgram/sdk";

// ---------------------------------------------------------------------------
// Derive the settings payload type from the SDK's socket method signature
// ---------------------------------------------------------------------------

type V1Socket = Awaited<ReturnType<InstanceType<typeof DeepgramClient>["agent"]["v1"]["connect"]>>;

export type AgentV1SettingsPayload = Parameters<V1Socket["sendSettings"]>[0];
export type AgentSettingsObject    = AgentV1SettingsPayload["agent"];

// Derived from the settings payload — no hand-written types
type AgentObject = Extract<AgentSettingsObject, object>;
export type AgentContext         = NonNullable<AgentObject["context"]>;
export type AgentContextMessage  = NonNullable<AgentContext["messages"]>[number];

// ---------------------------------------------------------------------------
// Re-export SDK think/speak types with shorter consumer-friendly names
// ---------------------------------------------------------------------------

export type { ThinkSettingsV1 as ThinkSettings, SpeakSettingsV1 as SpeakSettings } from "@deepgram/sdk";
export type { ThinkSettingsV1Provider as ThinkProvider, SpeakSettingsV1Provider as SpeakProvider } from "@deepgram/sdk";

// ---------------------------------------------------------------------------
// Server → client message types — aliased from the SDK's agent namespace
// ---------------------------------------------------------------------------

export type WelcomeMessage              = agent.AgentV1Welcome;
export type SettingsAppliedMessage      = agent.AgentV1SettingsApplied;
export type ConversationTextMessage     = agent.AgentV1ConversationText;
export type UserStartedSpeakingMessage  = agent.AgentV1UserStartedSpeaking;
export type AgentThinkingMessage        = agent.AgentV1AgentThinking;
export type FunctionCallRequestMessage  = agent.AgentV1FunctionCallRequest;
export type FunctionCallItem            = agent.AgentV1FunctionCallRequest.Functions.Item;
export type AgentStartedSpeakingMessage = agent.AgentV1AgentStartedSpeaking;
export type AgentAudioDoneMessage       = agent.AgentV1AgentAudioDone;
export type PromptUpdatedMessage        = agent.AgentV1PromptUpdated;
export type SpeakUpdatedMessage         = agent.AgentV1SpeakUpdated;
export type ThinkUpdatedMessage         = agent.AgentV1ThinkUpdated;
export type InjectionRefusedMessage     = agent.AgentV1InjectionRefused;
export type AgentErrorMessage           = agent.AgentV1Error;
export type AgentWarningMessage         = agent.AgentV1Warning;
// Note: SDK uses type "FunctionCallResponse" for server-received responses too
export type FunctionCallResponseMessage = agent.AgentV1ReceiveFunctionCallResponse;

export type ServerMessage =
  | WelcomeMessage
  | SettingsAppliedMessage
  | ConversationTextMessage
  | UserStartedSpeakingMessage
  | AgentThinkingMessage
  | FunctionCallRequestMessage
  | AgentStartedSpeakingMessage
  | AgentAudioDoneMessage
  | PromptUpdatedMessage
  | SpeakUpdatedMessage
  | ThinkUpdatedMessage
  | InjectionRefusedMessage
  | AgentErrorMessage
  | AgentWarningMessage
  | FunctionCallResponseMessage;

// ---------------------------------------------------------------------------
// Audio encoding helpers (not in SDK's public types; used by AgentSessionConfig)
// ---------------------------------------------------------------------------

export type AudioEncoding =
  | "linear16" | "linear32" | "flac" | "alaw" | "mulaw"
  | "amr-nb" | "amr-wb" | "opus" | "ogg-opus" | "speex" | "g729";

export type OutputEncoding = "linear16" | "mulaw" | "alaw";
