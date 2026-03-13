import type { Skill } from '../types';
import type { LLMToolDefinition } from '@lukeocodes/composite-voice';
import { navigationSkills } from './navigation';
import { projectSkills } from './project';
import { apiKeySkills } from './api-keys';
import { teamSkills } from './team';
import { billingSkills } from './billing';
import { usageSkills } from './usage';
import { settingsSkills } from './settings';
import { selfHostedSkills } from './self-hosted';

/** All registered skills the agent can use */
export const skillRegistry: Skill[] = [
  ...navigationSkills,
  ...projectSkills,
  ...apiKeySkills,
  ...teamSkills,
  ...billingSkills,
  ...usageSkills,
  ...settingsSkills,
  ...selfHostedSkills,
];

/** Get a skill by ID */
export function getSkill(id: string): Skill | undefined {
  return skillRegistry.find((s) => s.id === id);
}

/** Get all skills in a category */
export function getSkillsByCategory(category: string): Skill[] {
  return skillRegistry.filter((s) => s.category === category);
}

/** Convert skills to LLM tool definitions for Anthropic tool use */
export function buildToolDefinitions(): LLMToolDefinition[] {
  return skillRegistry.map((skill) => ({
    name: skill.id,
    description: `${skill.description}${skill.risk !== 'safe' ? ` [${skill.risk.toUpperCase()}]` : ''}`,
    parameters: {
      type: 'object' as const,
      properties: Object.fromEntries(
        skill.parameters.map((p) => [p.name, {
          type: p.type === 'enum' ? 'string' as const : p.type as 'string' | 'number' | 'boolean',
          description: p.description,
          ...(p.enumValues ? { enum: p.enumValues } : {}),
        }])
      ),
      required: skill.parameters.filter((p) => p.required).map((p) => p.name),
    },
  }));
}

/** Build the system prompt — tools carry the skill definitions, so this is just behavioral instructions */
export function buildSkillSystemPrompt(projectId: string | null): string {
  return `You are a helpful voice and chat assistant for the Deepgram Console — a developer dashboard for managing Deepgram API projects, keys, billing, usage, and team members.

You have tools available to help users manage their projects, API keys, billing, team, usage, and settings. Use the appropriate tool when the user asks you to do something.

${projectId ? `The user is currently viewing project: ${projectId}` : 'No project is currently selected.'}

## Tool Risk Levels
Tools tagged with [CONFIRM] in their description require user confirmation before execution — describe the action briefly and the system will prompt the user to confirm.
Tools tagged with [DANGEROUS] navigate to the relevant console page instead of executing directly — warn the user about consequences.

## UI Layout
You are displayed in a sidebar panel on the right side of the Deepgram Console. Below the chat message area, the user sees (left to right): a microphone toggle, a speaker toggle, a text input field, and a send button.

## Guidelines
- If a tool requires a project and none is selected, ask the user to select one first.
- Be concise. Keep responses short and conversational — your text may be spoken aloud via TTS.
- NEVER describe the outcome of a tool call before seeing the result. Say something brief like "Let me check that for you."
- When you receive a tool result, summarize it naturally for the user.
- You have full conversation history including previous tool results. If you already have the data, use it instead of re-calling the tool.
- For [CONFIRM] tools, use the tool immediately with a brief explanation — don't ask open-ended questions first.
- CRITICAL: Never hallucinate or guess UUIDs. Only use IDs that appeared in a previous tool result. If you don't have the ID, ask the user or list the relevant resources first.
- When switching projects: use the project-switch tool with the project's UUID from a previous project-list result. NEVER pass the project name as the projectId. NEVER re-list projects when you already have the data — use the cached result.
`;
}
