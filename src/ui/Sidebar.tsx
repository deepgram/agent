import { useState } from 'react';
import type { ConsoleAgentConfig } from '../types';
import { ChatPanel } from './ChatPanel';
import { CloseIcon, AgentIcon } from './icons';

interface Props {
  config: ConsoleAgentConfig;
  onClose: () => void;
}

export function Sidebar({ config, onClose }: Props) {
  return (
    <div className="dg-agent-sidebar">
      <div className="dg-agent-sidebar__header">
        <div className="dg-agent-sidebar__header-left">
          <AgentIcon />
          <span>{config.name ?? 'Assistant'}</span>
        </div>
        <button className="dg-agent-sidebar__close" onClick={onClose} title="Close">
          <CloseIcon />
        </button>
      </div>
      <ChatPanel config={config} />
    </div>
  );
}

/** Floating action button that toggles the sidebar */
export function FloatingButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <button
      className={`dg-agent-fab ${isOpen ? 'dg-agent-fab--open' : ''}`}
      onClick={onClick}
      title="Toggle assistant"
    >
      {isOpen ? <CloseIcon /> : <AgentIcon />}
    </button>
  );
}

/** Combined sidebar + FAB component */
export function AgentWidget({ config }: { config: ConsoleAgentConfig }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <Sidebar config={config} onClose={() => setIsOpen(false)} />}
      <FloatingButton onClick={() => setIsOpen((o) => !o)} isOpen={isOpen} />
    </>
  );
}
