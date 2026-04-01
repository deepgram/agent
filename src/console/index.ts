import type { Skill } from '../types';
import { navigationSkills } from './skills/navigation';
import { projectSkills } from './skills/project';
import { apiKeySkills } from './skills/api-keys';
import { teamSkills } from './skills/team';
import { billingSkills } from './skills/billing';
import { usageSkills } from './skills/usage';
import { settingsSkills } from './skills/settings';
import { selfHostedSkills } from './skills/self-hosted';
import { deepgramMcpSkills } from './skills/mcp';

/** Full Deepgram Console skill set — pass to init() for the console deployment */
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

export { fetchGitHubSkills, buildGitHubSkillsPromptSection } from './skills/github';
