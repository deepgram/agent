import { createContext, useContext } from "react";
import type { AgentSession, AgentState } from "@deepgram/agent";
import type { FunctionCallItem } from "@deepgram/agent";

export interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AgentMode = "idle" | "listening" | "speaking";

export interface AgentContextValue {
  // Raw session — escape hatch for anything not exposed here
  session: AgentSession;

  // Connection
  state: AgentState;
  start: () => Promise<void>;
  stop: () => void;

  // Mode (speaking / listening)
  mode: AgentMode;
  isSpeaking: boolean;
  isListening: boolean;

  // Conversation
  conversation: ConversationEntry[];
  clearConversation: () => void;
  sendUserMessage: (text: string) => void;

  // Microphone
  micActive: boolean;
  micMuted: boolean;
  setMicMuted: (muted: boolean) => void;
  micEnabled: boolean;

  // Audio playback
  outputMuted: boolean;
  setOutputMuted: (muted: boolean) => void;
  ttsEnabled: boolean;

  // Client tools — dynamic registration
  registerClientTool: (name: string, handler: (fn: FunctionCallItem) => Promise<string> | string) => void;
  unregisterClientTool: (name: string) => void;
}

export const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used inside <AgentProvider>");
  return ctx;
}
