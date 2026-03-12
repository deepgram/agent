import './styles.css';
import type { ConsoleAgentConfig } from './types';
import { orchestrate } from './orchestrator';

export type { ConsoleAgentConfig } from './types';
export type { Skill, SkillCategory, ChatMessage, AgentState } from './types';

/**
 * Initialize the Deepgram Console Agent widget.
 *
 * @example
 * ```js
 * import { init } from '@deepgram/console-agent';
 * init({
 *   anthropicProxyUrl: '/api/proxy/anthropic',
 *   deepgramSttProxyUrl: '/api/proxy/deepgram/listen',
 *   deepgramTtsProxyUrl: '/api/proxy/deepgram/speak',
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
