/**
 * Agent message types.
 *
 * Settings-related types are derived from or re-exported from @deepgram/sdk
 * so they stay in sync with the API automatically.
 */
import type { DeepgramClient, ThinkSettingsV1, SpeakSettingsV1 } from "@deepgram/sdk";

// ---------------------------------------------------------------------------
// Derive settings types from the SDK's actual method signatures
// This is the only source of truth — no hand-maintained parallel types.
// ---------------------------------------------------------------------------

type V1Socket = Awaited<ReturnType<InstanceType<typeof DeepgramClient>["agent"]["v1"]["connect"]>>;

/** Full Settings payload — derived from socket.sendSettings() parameter type */
export type AgentV1SettingsPayload = Parameters<V1Socket["sendSettings"]>[0];

/** The `agent` field of the Settings payload */
export type AgentSettingsObject = AgentV1SettingsPayload["agent"];

// ---------------------------------------------------------------------------
// Re-export SDK types consumers need for constructing think/speak settings
// ---------------------------------------------------------------------------

export type { ThinkSettingsV1 as ThinkSettings, SpeakSettingsV1 as SpeakSettings } from "@deepgram/sdk";
export type { ThinkSettingsV1Provider as ThinkProvider, SpeakSettingsV1Provider as SpeakProvider } from "@deepgram/sdk";

// ---------------------------------------------------------------------------
// Audio encoding types
// ---------------------------------------------------------------------------

export type AudioEncoding =
  | "linear16"
  | "linear32"
  | "flac"
  | "alaw"
  | "mulaw"
  | "amr-nb"
  | "amr-wb"
  | "opus"
  | "ogg-opus"
  | "speex"
  | "g729";

export type OutputEncoding = "linear16" | "mulaw" | "alaw";

// ---------------------------------------------------------------------------
// SERVER → CLIENT message types
// ---------------------------------------------------------------------------

export interface WelcomeMessage {
  type: "Welcome";
  request_id: string;
}

export interface SettingsAppliedMessage {
  type: "SettingsApplied";
}

export interface ConversationTextMessage {
  type: "ConversationText";
  role: "user" | "assistant";
  content: string;
}

export interface UserStartedSpeakingMessage {
  type: "UserStartedSpeaking";
}

export interface AgentThinkingMessage {
  type: "AgentThinking";
  content: string;
}

export interface FunctionCallItem {
  id: string;
  name: string;
  arguments: string;
  client_side: boolean;
}

export interface FunctionCallRequestMessage {
  type: "FunctionCallRequest";
  functions: FunctionCallItem[];
}

export interface AgentStartedSpeakingMessage {
  type: "AgentStartedSpeaking";
  total_latency: number;
  tts_latency: number;
  ttt_latency: number;
}

export interface AgentAudioDoneMessage { type: "AgentAudioDone"; }
export interface PromptUpdatedMessage   { type: "PromptUpdated"; }
export interface SpeakUpdatedMessage    { type: "SpeakUpdated"; }
export interface ThinkUpdatedMessage    { type: "ThinkUpdated"; }

export interface InjectionRefusedMessage {
  type: "InjectionRefused";
  message: string;
}

export interface AgentErrorMessage {
  type: "Error";
  description: string;
  code: string;
}

export interface AgentWarningMessage {
  type: "Warning";
  description: string;
  code: string;
}

export interface ReceiveFunctionCallResponseMessage {
  type: "ReceiveFunctionCallResponse";
  id: string;
  name: string;
  content: string;
}

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
  | ReceiveFunctionCallResponseMessage;
