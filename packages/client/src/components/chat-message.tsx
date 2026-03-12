import type { ChatMessage as ChatMessageType } from '../types';

interface Props {
  message: ChatMessageType;
}

export function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Strip skill blocks from display
  const displayContent = message.content.replace(/```skill\s*\n[\s\S]*?\n```/g, '').trim();
  if (!displayContent) return null;

  return (
    <div
      className={`dg-agent-message ${isUser ? 'dg-agent-message--user' : ''} ${isSystem ? 'dg-agent-message--system' : ''}`}
    >
      {message.skillUsed && (
        <div className="dg-agent-message__skill">
          Executed: {message.skillUsed}
        </div>
      )}
      <div className="dg-agent-message__content">
        {displayContent}
      </div>
      <div className="dg-agent-message__time">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
