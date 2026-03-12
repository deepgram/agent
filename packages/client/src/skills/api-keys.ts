import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const apiKeySkills: Skill[] = [
  {
    id: 'keys-list',
    name: 'List API Keys',
    description: 'List all API keys for the current project',
    category: 'api-keys',
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
    description: 'Create a new API key with optional comment, expiration, scopes, and tags',
    category: 'api-keys',
    parameters: [
      { name: 'comment', type: 'string', description: 'Label/comment for the key', required: true },
      { name: 'expirationDate', type: 'string', description: 'Expiration date (ISO 8601) or empty for no expiry', required: false },
      { name: 'scopes', type: 'string', description: 'Comma-separated scopes (e.g. member,admin)', required: false },
      { name: 'tags', type: 'string', description: 'Comma-separated tags', required: false },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const body: Record<string, unknown> = { comment: params.comment };
      if (params.expirationDate) body.expiration_date = params.expirationDate;
      if (params.scopes) body.scopes = (params.scopes as string).split(',').map((s) => s.trim());
      if (params.tags) body.tags = (params.tags as string).split(',').map((t) => t.trim());
      const res = await apiCall(ctx, 'POST', `/projects/${ctx.projectId}/keys`, body);
      if (!res.success) return res;
      return { success: true, message: `API key created: ${(res.data as { comment: string }).comment}. The key value is shown only once — copy it now!`, data: res.data };
    },
  },
  {
    id: 'keys-delete',
    name: 'Delete API Key',
    description: 'Delete an API key by its ID (destructive)',
    category: 'api-keys',
    parameters: [
      { name: 'keyId', type: 'string', description: 'The API key ID to delete', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/keys/${params.keyId}`);
    },
  },
];
