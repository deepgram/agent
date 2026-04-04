import { createContext, useContext } from "react";
import type { AgentSession, AgentState } from "@deepgram/agent";
import type { FunctionCallItem } from "@deepgram/agent";

export interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AgentContextValue {
  // Raw session — escape hatch for anything not exposed here
  session: AgentSession;

  // Connection
  state: AgentState;
  start: () => Promise<void>;
  stop: () => void;

  // Conversation
  conversation: ConversationEntry[];
  clearConversation: () => void;
  sendUserMessage: (text: string) => void;

  // Microphone
  micActive: boolean;
  micMuted: boolean;
  setMicMuted: (muted: boolean) => void;
  /** false when the provider's microphone={false} prop is set */
  micEnabled: boolean;

  // Audio playback
  outputMuted: boolean;
  setOutputMuted: (muted: boolean) => void;
  /** false when the provider's tts={false} prop is set */
  ttsEnabled: boolean;
}

export const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used inside <AgentProvider>");
  return ctx;
}
