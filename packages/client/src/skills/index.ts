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
import { deepgramMcpSkills } from './mcp';

/** All registered skills for the Deepgram Console deployment */
export const skillRegistry: Skill[] = [
  ...navigationSkills,
  ...projectSkills,
  ...apiKeySkills,
  ...teamSkills,
  ...billingSkills,
  ...usageSkills,
  ...settingsSkills,
  ...selfHostedSkills,
  ...deepgramMcpSkills,
];

/** Get a skill by ID */
export function getSkill(id: string, skills: Skill[] = skillRegistry): Skill | undefined {
  return skills.find((s) => s.id === id);
}

/** Get all skills in a category */
export function getSkillsByCategory(category: string, skills: Skill[] = skillRegistry): Skill[] {
  return skills.filter((s) => s.category === category);
}

/** Convert skills to LLM tool definitions for Anthropic tool use */
export function buildToolDefinitions(skills: Skill[] = skillRegistry): LLMToolDefinition[] {
  return skills.map((skill) => ({
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
