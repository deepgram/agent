// All AgentV1 message types, verified against the installed @deepgram/sdk v5 type definitions.
// Key correction: think and speak use { provider: { type, model, ... } } — NOT the flat { type, model } shape.

// ---------------------------------------------------------------------------
// Shared
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
// Function definitions (used in think settings)
// ---------------------------------------------------------------------------

export interface FunctionDefinition {
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  /** If omitted, the function is executed client-side via FunctionCallRequest */
  endpoint?: { url: string; headers?: Record<string, string> };
}

// ---------------------------------------------------------------------------
// Listen provider
// ---------------------------------------------------------------------------

export interface ListenProviderDeepgramV1 {
  type: "deepgram";
  version: "v1";
  model?: string;
  language?: string;
  keyterms?: string[];
  smart_format?: boolean;
}

export interface ListenProviderDeepgramV2 {
  type: "deepgram";
  version: "v2";
  model?: string;
  keyterms?: string[];
  eot_threshold?: number;
  eager_eot_threshold?: number;
  eot_timeout_ms?: number;
}

export type ListenProvider = ListenProviderDeepgramV1 | ListenProviderDeepgramV2;

// ---------------------------------------------------------------------------
// Think provider (goes inside ThinkSettings.provider)
// ---------------------------------------------------------------------------

export interface ThinkProviderOpenAI {
  type: "open_ai";
  version?: "v1";
  model: string;
  temperature?: number;
}

export interface ThinkProviderAnthropic {
  type: "anthropic";
  version?: "v1";
  model: string;
  temperature?: number;
}

export interface ThinkProviderGoogle {
  type: "google";
  model: string;
  temperature?: number;
}

export interface ThinkProviderGroq {
  type: "groq";
  model: string;
  temperature?: number;
}

export interface ThinkProviderAWSBedrock {
  type: "aws_bedrock";
  model: string;
  temperature?: number;
  credentials: {
    type: "sts" | "iam";
    region: string;
    access_key_id: string;
    secret_access_key: string;
    session_token?: string;
  };
}

export type ThinkProvider =
  | ThinkProviderOpenAI
  | ThinkProviderAnthropic
  | ThinkProviderGoogle
  | ThinkProviderGroq
  | ThinkProviderAWSBedrock;

// ---------------------------------------------------------------------------
// Think settings (agent.think)
// ---------------------------------------------------------------------------

export interface ThinkSettings {
  provider: ThinkProvider;
  /** System prompt */
  prompt?: string;
  functions?: FunctionDefinition[];
  context_length?: number;
}

// ---------------------------------------------------------------------------
// Speak provider (goes inside SpeakSettings.provider)
// ---------------------------------------------------------------------------

export interface SpeakProviderDeepgram {
  type: "deepgram";
  version?: "v1";
  model: string;
}

export interface SpeakProviderElevenLabs {
  type: "eleven_labs";
  model_id?: string;
  voice_id?: string;
}

export interface SpeakProviderCartesia {
  type: "cartesia";
  model_id?: string;
  voice?: Record<string, unknown>;
}

export interface SpeakProviderOpenAI {
  type: "open_ai";
  version?: "v1";
  model?: string;
  voice?: string;
}

export type SpeakProvider =
  | SpeakProviderDeepgram
  | SpeakProviderElevenLabs
  | SpeakProviderCartesia
  | SpeakProviderOpenAI;

// ---------------------------------------------------------------------------
// Speak settings (agent.speak)
// ---------------------------------------------------------------------------

export interface SpeakSettings {
  provider: SpeakProvider;
}

// ---------------------------------------------------------------------------
// Agent settings object
// ---------------------------------------------------------------------------

export interface HistoryMessage {
  type: "History";
  role: "user" | "assistant";
  content: string;
}

export interface HistoryFunctionCall {
  type: "History";
  function_calls: Array<{
    id: string;
    name: string;
    client_side: boolean;
    arguments: string;
    response: string;
  }>;
}

export interface AgentSettingsObject {
  greeting?: string;
  context?: {
    messages: Array<HistoryMessage | HistoryFunctionCall>;
  };
  listen?: {
    provider?: ListenProvider;
  };
  think?: ThinkSettings | ThinkSettings[];
  speak?: SpeakSettings | SpeakSettings[];
}

// ---------------------------------------------------------------------------
// Full Settings payload (CLIENT → SERVER)
// ---------------------------------------------------------------------------

export interface AgentV1SettingsPayload {
  type: "Settings";
  tags?: string[];
  experimental?: boolean;
  flags?: { history?: boolean };
  mip_opt_out?: boolean;
  audio: {
    input?: {
      encoding: AudioEncoding;
      sample_rate: number;
    };
    output?: {
      encoding?: OutputEncoding;
      sample_rate?: number;
      bitrate?: number;
      container?: string;
    };
  };
  agent: AgentSettingsObject | string;
}

// ---------------------------------------------------------------------------
// Other CLIENT → SERVER messages
// ---------------------------------------------------------------------------

export interface UpdateSpeakMessage {
  type: "UpdateSpeak";
  speak: SpeakSettings | SpeakSettings[];
}

export interface UpdateThinkMessage {
  type: "UpdateThink";
  think: ThinkSettings | ThinkSettings[];
}

export interface UpdatePromptMessage {
  type: "UpdatePrompt";
  prompt: string;
}

export interface InjectUserMessage {
  type: "InjectUserMessage";
  content: string;
}

export interface InjectAgentMessage {
  type: "InjectAgentMessage";
  message: string;
}

export interface FunctionCallResponseMessage {
  type: "FunctionCallResponse";
  id?: string;
  name: string;
  content: string;
}

export interface KeepAliveMessage {
  type: "KeepAlive";
}

// ---------------------------------------------------------------------------
// SERVER → CLIENT messages
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

export interface AgentAudioDoneMessage {
  type: "AgentAudioDone";
}

export interface PromptUpdatedMessage {
  type: "PromptUpdated";
}

export interface SpeakUpdatedMessage {
  type: "SpeakUpdated";
}

export interface ThinkUpdatedMessage {
  type: "ThinkUpdated";
}

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
