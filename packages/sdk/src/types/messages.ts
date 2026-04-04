// All AgentV1 message types derived from the Deepgram AsyncAPI spec
// https://dpgr.am/asyncapi.yml

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
// Settings — CLIENT → SERVER
// ---------------------------------------------------------------------------

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export interface ThinkSettingsOpenAI {
  type: "open_ai";
  version?: "v1";
  model:
    | "gpt-5"
    | "gpt-5-mini"
    | "gpt-4.5-preview"
    | "gpt-4o"
    | "gpt-4o-mini"
    | "gpt-4-turbo"
    | "gpt-3.5-turbo"
    | (string & {});
  temperature?: number;
  instructions?: string;
  functions?: FunctionDefinition[];
}

export interface ThinkSettingsAnthropic {
  type: "anthropic";
  version?: "v1";
  model:
    | "claude-opus-4-6"
    | "claude-sonnet-4-6"
    | "claude-haiku-4-5-20251001"
    | "claude-3-5-haiku-latest"
    | "claude-sonnet-4-20250514"
    | (string & {});
  temperature?: number;
  functions?: FunctionDefinition[];
}

export interface ThinkSettingsGoogle {
  type: "google";
  model:
    | "gemini-2.0-flash"
    | "gemini-2.0-flash-lite"
    | "gemini-1.5-pro"
    | "gemini-1.5-flash"
    | (string & {});
  temperature?: number;
  functions?: FunctionDefinition[];
}

export interface ThinkSettingsGroq {
  type: "groq";
  model:
    | "llama-3.3-70b-versatile"
    | "llama-3.1-8b-instant"
    | "llama3-70b-8192"
    | "llama3-8b-8192"
    | "mixtral-8x7b-32768"
    | (string & {});
  temperature?: number;
  functions?: FunctionDefinition[];
}

export interface ThinkSettingsAWSBedrock {
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
  functions?: FunctionDefinition[];
}

export type ThinkSettings =
  | ThinkSettingsOpenAI
  | ThinkSettingsAnthropic
  | ThinkSettingsGoogle
  | ThinkSettingsGroq
  | ThinkSettingsAWSBedrock;

export interface SpeakSettings {
  type: "deepgram";
  model: string; // e.g. "aura-2-thalia-en"
  encoding?: OutputEncoding;
  sample_rate?: number;
}

export interface ListenProviderDeepgram {
  type: "deepgram";
  version?: "v1" | "v2";
  model: string; // v1: nova-3 | v2: flux-general-en
  language?: string;
  keyterms?: string[];
  smart_format?: boolean;
}

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
    arguments: string; // JSON string
    response: string; // JSON string
  }>;
}

export interface AgentSettingsObject {
  language?: string; // deprecated, use listen.provider.language
  greeting?: string;
  context?: {
    messages: Array<HistoryMessage | HistoryFunctionCall>;
  };
  listen?: {
    provider: ListenProviderDeepgram;
  };
  think?: ThinkSettings | ThinkSettings[];
  speak?: SpeakSettings | SpeakSettings[];
}

export interface AgentV1SettingsPayload {
  type: "Settings";
  tags?: string[];
  experimental?: boolean;
  flags?: {
    history?: boolean;
  };
  mip_opt_out?: boolean;
  audio: {
    input: {
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
  agent: AgentSettingsObject | string; // object or agent UUID
}

// ---------------------------------------------------------------------------
// Other client → server messages
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
  content: string; // JSON string
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
  arguments: string; // JSON string
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
