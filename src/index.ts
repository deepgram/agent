import './styles.css';
import type { ConsoleAgentConfig } from './types';
import { orchestrate } from './orchestrator';

export type { ConsoleAgentConfig, AgentModelConfig } from './types';
export type { Skill, SkillCategory, SkillParameter, SkillContext, SkillResult, SkillRisk, ChatMessage, AgentState } from './types';
export { buildToolDefinitions } from './skills';
export { apiCall } from './skills/api';
export { deepgramKnowledgeSkill } from './skills/deepgram-mcp';
export { fetchDeepgramSkillsContext } from './skills/github-context';
export { BASE_AGENT_GUIDELINES, SIDEBAR_LAYOUT, INLINE_LAYOUT } from './prompt/base';

/**
 * Initialize the Deepgram agent widget.
 *
 * @example
 * ```js
 * import { init } from '@deepgram/agent';
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
