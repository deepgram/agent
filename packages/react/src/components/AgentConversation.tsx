import { useEffect, useRef } from "react";
import { useAgentConversation } from "../hooks/useAgentConversation.js";
import type { ConversationEntry } from "../context.js";

export interface AgentConversationProps {
  className?: string;
  itemClassName?: string;
  /** Custom renderer for a single message. */
  renderMessage?: (entry: ConversationEntry) => unknown;
  /** Content shown when there are no messages yet. */
  emptyState?: unknown;
  /** Auto-scroll to bottom on new messages. Default: true */
  autoScroll?: boolean;
}

/**
 * Renders the conversation history.
 * Each message has a `data-role` attribute ("user" | "assistant") for styling.
 */
export function AgentConversation({
  className,
  itemClassName,
  renderMessage,
  emptyState,
  autoScroll = true,
}: AgentConversationProps) {
  const { conversation } = useAgentConversation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, autoScroll]);

  return (
    <div className={className} data-agent-conversation aria-live="polite" aria-label="Conversation">
      {conversation.length === 0
        ? (emptyState as React.ReactNode ?? null)
        : conversation.map((entry) => (
            <div key={entry.id} className={itemClassName} data-role={entry.role}>
              {renderMessage ? renderMessage(entry) as React.ReactNode : entry.content}
            </div>
          ))}
      <div ref={bottomRef} />
    </div>
  );
}
