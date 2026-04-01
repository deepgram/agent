import type { Skill } from '../../types';
import { apiCall } from '../../skills/api';

export const selfHostedSkills: Skill[] = [
  {
    id: 'selfhosted-list',
    name: 'List Distribution Credentials',
    description: 'List all self-hosted distribution credentials',
    category: 'self-hosted',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/self-hosted/distribution/credentials`);
    },
  },
  {
    id: 'selfhosted-create',
    name: 'Create Distribution Credential',
    description: 'Navigate to the self-hosted page where the user can create a new distribution credential',
    category: 'self-hosted',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/self-hosted`);
      return { success: true, message: 'Navigated to Self-Hosted. You can create a new credential from here.', navigateTo: `/project/${ctx.projectId}/self-hosted` };
    },
  },
  {
    id: 'selfhosted-delete',
    name: 'Delete Distribution Credential',
    description: 'Navigate to self-hosted page where the user can delete a credential manually',
    category: 'self-hosted',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/self-hosted`);
      return { success: true, message: 'Navigated to Self-Hosted. You can delete credentials from there.', navigateTo: `/project/${ctx.projectId}/self-hosted` };
    },
  },
];
