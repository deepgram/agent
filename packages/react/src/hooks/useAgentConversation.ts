import { useAgentContext, type ConversationEntry } from "../context.js";

export interface UseAgentConversationResult {
  conversation: ConversationEntry[];
  clearConversation: () => void;
  sendUserMessage: (text: string) => void;
}

/** Conversation history and text messaging. */
export function useAgentConversation(): UseAgentConversationResult {
  const { conversation, clearConversation, sendUserMessage } = useAgentContext();
  return { conversation, clearConversation, sendUserMessage };
}
