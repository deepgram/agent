import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const apiKeySkills: Skill[] = [
  {
    id: 'keys-list',
    name: 'List API Keys',
    description: 'List all API keys for the current project',
    category: 'api-keys',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/keys?include_comment_metadata=true`);
      if (!res.success) return res;
      const keys = (res.data as { api_keys: Array<{ api_key_id: string; comment: string; scopes: string[]; created: string }> }).api_keys;
      const list = keys.map((k) => `• ${k.comment || '(unnamed)'} — ${k.api_key_id.slice(0, 8)}... (${k.scopes?.join(', ') || 'all scopes'})`).join('\n');
      return { success: true, message: `${keys.length} API key(s):\n${list}`, data: keys };
    },
  },
  {
    id: 'keys-create',
    name: 'Create API Key',
    description: 'Navigate to the API keys page with the create form open so the user can name their key and copy the secret',
    category: 'api-keys',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/keys?action=create`);
      return {
        success: true,
        message: 'Opened the Create API Key form. Name your key and click "Create Key" — the secret will appear for you to copy.',
        navigateTo: `/project/${ctx.projectId}/keys?action=create`,
      };
    },
  },
  {
    id: 'keys-delete',
    name: 'Delete API Key',
    description: 'Navigate to API keys page where the user can delete a key manually — keys cannot be recovered once deleted',
    category: 'api-keys',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/keys`);
      return { success: true, message: 'Navigated to API Keys. You can delete keys from there.', navigateTo: `/project/${ctx.projectId}/keys` };
    },
  },
];
