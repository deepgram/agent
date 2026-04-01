import './styles.css';
import type { ConsoleAgentConfig } from './types';
import { orchestrate } from './orchestrator';

export type { ConsoleAgentConfig, AgentModelConfig } from './types';
export type { Skill, SkillCategory, SkillParameter, SkillContext, SkillResult, SkillRisk, ChatMessage, AgentState } from './types';
export { skillRegistry, buildToolDefinitions } from './skills';
export { buildConsoleSystemPrompt } from './prompt/console';
export { BASE_AGENT_GUIDELINES } from './prompt/base';

/**
 * Initialize the Deepgram agent widget.
 *
 * @example
 * ```js
 * import { init } from '@deepgram/agent-client';
 * init({ buttonId: 'dg-ask-ai-btn' });
 * ```
 */
export function init(config: ConsoleAgentConfig = {}): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => orchestrate(config));
  } else {
    orchestrate(config);
  }
}
