import type { Skill } from '../types';
import type { LLMToolDefinition } from '@lukeocodes/composite-voice';

/** Get a skill by ID from a given skill set */
export function getSkill(id: string, skills: Skill[]): Skill | undefined {
  return skills.find((s) => s.id === id);
}

/** Convert a skill set to LLM tool definitions for Anthropic tool use */
export function buildToolDefinitions(skills: Skill[]): LLMToolDefinition[] {
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
