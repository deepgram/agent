import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const selfHostedSkills: Skill[] = [
  {
    id: 'selfhosted-list',
    name: 'List Distribution Credentials',
    description: 'List all self-hosted distribution credentials',
    category: 'self-hosted',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/self-hosted/distribution/credentials`);
    },
  },
  {
    id: 'selfhosted-create',
    name: 'Create Distribution Credential',
    description: 'Create a new credential for self-hosted deployments',
    category: 'self-hosted',
    parameters: [
      { name: 'comment', type: 'string', description: 'Label for the credential', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'POST', `/projects/${ctx.projectId}/self-hosted/distribution/credentials`, {
        comment: params.comment,
      });
    },
  },
  {
    id: 'selfhosted-delete',
    name: 'Delete Distribution Credential',
    description: 'Delete a self-hosted distribution credential (destructive)',
    category: 'self-hosted',
    parameters: [
      { name: 'credentialId', type: 'string', description: 'The credential ID to delete', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/self-hosted/distribution/credentials/${params.credentialId}`);
    },
  },
];
