import type { ChatMessage as ChatMessageType } from '../types';

interface Props {
  message: ChatMessageType;
  onConfirm?: () => void;
  onCancel?: () => void;
  isPending?: boolean;
}

export function ChatMessageBubble({ message, onConfirm, onCancel, isPending }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Strip skill blocks from display
  const displayContent = message.content.replace(/```skill\s*\n[\s\S]*?\n```/g, '').trim();
  if (!displayContent && !message.pendingSkill) return null;

  const isDangerous = message.pendingSkill?.risk === 'dangerous';
  const isConfirm = message.pendingSkill?.risk === 'confirm';
  const hasCta = !!message.cta;
  const hasSources = !!message.sources?.length;

  if (message.role === 'assistant') {
    console.log('[agent] Rendering assistant message:', { hasCta, cta: message.cta, hasSources, sourcesCount: message.sources?.length });
  }

  return (
    <div
      className={`dg-agent-message ${isUser ? 'dg-agent-message--user' : ''} ${isSystem ? 'dg-agent-message--system' : ''}`}
    >
      {message.skillUsed && !message.pendingSkill && (
        <div className="dg-agent-message__skill">
          Executed: {message.skillUsed}
        </div>
      )}

      <div className="dg-agent-message__content">
        {displayContent && (
          <div className="dg-agent-message__text">
            {displayContent}
          </div>
        )}

        {/* CTA button — prominent link to the most relevant doc page */}
        {hasCta && (
          <div className="dg-agent-cta">
            <a
              className="dg-agent-cta__button"
              href={message.cta!.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {message.cta!.title}
              <span className="dg-agent-cta__arrow">&rarr;</span>
            </a>
          </div>
        )}

        {/* Source links — visual only, never spoken by TTS */}
        {hasSources && (
          <div className="dg-agent-sources">
            {message.sources!.map((src, i) => (
              <a
                key={i}
                className="dg-agent-sources__link"
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={src.url}
              >
                {src.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation UI for pending skills */}
      {message.pendingSkill && isPending && (
        <div className={`dg-agent-confirm ${isDangerous ? 'dg-agent-confirm--dangerous' : 'dg-agent-confirm--confirm'}`}>
          {isDangerous && (
            <>
              <div className="dg-agent-confirm__label">This action is destructive and cannot be undone.</div>
              <div className="dg-agent-confirm__actions">
                <button className="dg-agent-confirm__btn dg-agent-confirm__btn--danger" onClick={onConfirm}>
                  Confirm {message.pendingSkill.skillName}
                </button>
                <button className="dg-agent-confirm__btn dg-agent-confirm__btn--cancel" onClick={onCancel}>
                  Cancel
                </button>
              </div>
            </>
          )}
          {isConfirm && (
            <div className="dg-agent-confirm__label">
              Confirm with a voice or text response (e.g. &quot;yes&quot;, &quot;go ahead&quot;, &quot;sure&quot;), or say anything else to cancel.
            </div>
          )}
        </div>
      )}

      {/* Show expired pending state */}
      {message.pendingSkill && !isPending && (
        <div className="dg-agent-confirm dg-agent-confirm--resolved">
          <div className="dg-agent-confirm__label">Action resolved.</div>
        </div>
      )}

      <div className="dg-agent-message__time">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
