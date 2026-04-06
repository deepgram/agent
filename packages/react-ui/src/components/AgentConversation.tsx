import { useEffect, useRef } from "react";
import { useAgentConversation, type ConversationEntry } from "@deepgram/agent-react";

export interface AgentConversationProps {
  className?: string;
  itemClassName?: string;
  renderMessage?: (entry: ConversationEntry) => unknown;
  emptyState?: unknown;
  autoScroll?: boolean;
}

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
