import type { ConsoleAgentConfig } from '../types';
import { ChatPanel } from './ChatPanel';

interface Props {
  config: ConsoleAgentConfig;
}

export function InlineChat({ config }: Props) {
  return (
    <div className="dg-agent-inline">
      <ChatPanel config={config} />
    </div>
  );
}
