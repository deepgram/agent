import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../types';
import { CodeModal } from './code-modal';

interface Props {
  message: ChatMessageType;
  onConfirm?: () => void;
  onCancel?: () => void;
  isPending?: boolean;
}

/** Split message content into text segments and code blocks */
function parseContent(text: string): Array<{ type: 'text'; value: string } | { type: 'code'; lang: string; value: string }> {
  const parts: Array<{ type: 'text'; value: string } | { type: 'code'; lang: string; value: string }> = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', lang: match[1] || 'text', value: match[2].trimEnd() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

function CodePreview({ lang, code }: { lang: string; code: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = code.split('\n');
  const preview = lines.slice(0, 4).join('\n');
  const truncated = lines.length > 4;

  return (
    <>
      <div className="dg-agent-code-preview">
        <div className="dg-agent-code-preview__header">
          <span className="dg-agent-code-preview__lang">{lang}</span>
          {truncated && (
            <button className="dg-agent-code-preview__expand" onClick={() => setExpanded(true)}>
              Expand
            </button>
          )}
        </div>
        <pre className="dg-agent-code-preview__pre"><code>{truncated ? preview + '\n...' : code}</code></pre>
      </div>
      {expanded && <CodeModal code={code} language={lang} onClose={() => setExpanded(false)} />}
    </>
  );
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

  const contentParts = displayContent ? parseContent(displayContent) : [];

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
        {contentParts.map((part, i) =>
          part.type === 'text' ? (
            part.value.trim() ? <div key={i} className="dg-agent-message__text">{part.value.trim()}</div> : null
          ) : (
            <CodePreview key={i} lang={part.lang} code={part.value} />
          )
        )}

        {/* CTA button */}
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

        {/* Source link pills */}
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
