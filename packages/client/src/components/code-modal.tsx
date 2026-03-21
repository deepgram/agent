import { useCallback, useState } from 'react';

interface Props {
  code: string;
  language: string;
  onClose: () => void;
}

export function CodeModal({ code, language, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="dg-agent-code-modal__overlay" onClick={onClose}>
      <div className="dg-agent-code-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dg-agent-code-modal__header">
          <span className="dg-agent-code-modal__lang">{language || 'code'}</span>
          <div className="dg-agent-code-modal__actions">
            <button className="dg-agent-code-modal__btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="dg-agent-code-modal__btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="dg-agent-code-modal__pre"><code>{code}</code></pre>
      </div>
    </div>
  );
}
