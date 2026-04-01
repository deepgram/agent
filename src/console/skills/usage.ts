import type { Skill } from '../../types';
import { apiCall } from '../../skills/api';

export const usageSkills: Skill[] = [
  {
    id: 'usage-overview',
    name: 'View Usage Overview',
    description: 'Get usage summary for the project, optionally filtered by date range',
    category: 'usage',
    risk: 'safe',
    parameters: [
      { name: 'from', type: 'string', description: 'Start date (ISO 8601)', required: false },
      { name: 'to', type: 'string', description: 'End date (ISO 8601)', required: false },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const qp = new URLSearchParams();
      if (params.from) qp.set('from', params.from as string);
      if (params.to) qp.set('to', params.to as string);
      const qs = qp.toString() ? `?${qp.toString()}` : '';
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/usage/breakdown${qs}`);
    },
  },
  {
    id: 'usage-fields',
    name: 'Get Usage Fields',
    description: 'Get available models, features, tags, and processing methods for filtering usage data',
    category: 'usage',
    risk: 'safe',
    parameters: [
      { name: 'endpoint', type: 'string', description: 'Filter fields by endpoint (e.g. listen, speak, agent)', required: false },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const segments = params.endpoint
        ? ['usage', 'fields', params.endpoint as string]
        : ['usage', 'fields'];
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/${segments.join('/')}`);
    },
  },
  {
    id: 'usage-export',
    name: 'Export Usage CSV',
    description: 'Export usage breakdown data as CSV for a given date range',
    category: 'usage',
    risk: 'safe',
    parameters: [
      { name: 'from', type: 'string', description: 'Start date (ISO 8601)', required: true },
      { name: 'to', type: 'string', description: 'End date (ISO 8601)', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const qp = new URLSearchParams();
      qp.set('from', params.from as string);
      qp.set('to', params.to as string);
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/usage/export/breakdown?${qp.toString()}`);
    },
  },
  {
    id: 'usage-logs',
    name: 'View Request Logs',
    description: 'Get detailed request-level logs with pagination',
    category: 'usage',
    risk: 'safe',
    parameters: [
      { name: 'from', type: 'string', description: 'Start date (ISO 8601)', required: false },
      { name: 'to', type: 'string', description: 'End date (ISO 8601)', required: false },
      { name: 'limit', type: 'number', description: 'Number of results (default 10)', required: false },
      { name: 'page', type: 'number', description: 'Page number (default 1)', required: false },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const qp = new URLSearchParams();
      if (params.from) qp.set('from', params.from as string);
      if (params.to) qp.set('to', params.to as string);
      qp.set('limit', String((params.limit as number) || 10));
      qp.set('page', String((params.page as number) || 1));
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/requests?${qp.toString()}`);
    },
  },
  {
    id: 'usage-request-detail',
    name: 'View Request Details',
    description: 'Get full details of a specific API request by its ID',
    category: 'usage',
    risk: 'safe',
    parameters: [
      { name: 'requestId', type: 'string', description: 'The request ID to look up', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/requests/${params.requestId}`);
    },
  },
];
