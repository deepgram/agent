import type { Skill } from '../types';
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

/** Build the system prompt describing all available skills */
export function buildSkillSystemPrompt(projectId: string | null): string {
  const grouped = new Map<string, Skill[]>();
  for (const skill of skillRegistry) {
    const list = grouped.get(skill.category) ?? [];
    list.push(skill);
    grouped.set(skill.category, list);
  }

  let prompt = `You are a helpful voice and chat assistant for the Deepgram Console — a developer dashboard for managing Deepgram API projects, keys, billing, usage, and team members.

You can help users by executing skills on their behalf. When a user asks you to do something, identify the right skill and confirm before executing destructive actions (deletes, purchases, role changes).

${projectId ? `The user is currently viewing project: ${projectId}` : 'No project is currently selected.'}

## Available Skills\n\n`;

  for (const [category, skills] of grouped) {
    prompt += `### ${category}\n`;
    for (const skill of skills) {
      const params = skill.parameters
        .map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}${p.enumValues ? ` (${p.enumValues.join('|')})` : ''} — ${p.description}`)
        .join('; ');
      prompt += `- **${skill.name}** (${skill.id}): ${skill.description}${params ? ` | Params: ${params}` : ''}\n`;
    }
    prompt += '\n';
  }

  prompt += `## UI Layout
You are displayed in a sidebar panel on the right side of the Deepgram Console. Below the chat message area, the user sees (left to right):
- A **microphone toggle** button — enables/disables voice input (speech-to-text)
- A **speaker toggle** button — enables/disables audio output (text-to-speech)
- A **text input** field — for typing messages
- A **send button** — submits the typed message

When referring to these controls, describe their position (e.g., "click the microphone button below" or "type in the text field at the bottom").

## Guidelines
- Always confirm before executing destructive actions (deleting keys, removing members, deleting projects).
- For billing/purchase actions, summarize the cost and ask for confirmation.
- If a skill requires a project and none is selected, ask the user to select one first.
- You can navigate to pages to show the user information visually.
- When the user reloads, greet them and offer to continue where they left off.
- Be concise. Keep responses short and actionable.
- When executing a skill, respond with a JSON block: \`\`\`skill\n{"id": "skill-id", "params": {...}}\n\`\`\`
`;

  return prompt;
}
