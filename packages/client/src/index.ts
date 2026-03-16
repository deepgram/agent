import './styles.css';
import type { ConsoleAgentConfig } from './types';
import { orchestrate } from './orchestrator';

export type { ConsoleAgentConfig } from './types';
export type { Skill, SkillCategory, ChatMessage, AgentState } from './types';

/**
 * Initialize the Deepgram Console Agent widget.
 *
 * When embedded in the Deepgram Console (console.deepgram.com), the widget
 * authenticates automatically via the session cookie through the DX API.
 *
 * @example
 * ```js
 * import { init } from '@deepgram/console-agent';
 * init({
 *   dxApiUrl: 'https://api.dx.deepgram.com',
 *   manageUrl: 'https://manage.deepgram.com',
 * });
 * ```
 */
export function init(config: ConsoleAgentConfig = {}): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => orchestrate(config));
  } else {
    orchestrate(config);
  }
}
