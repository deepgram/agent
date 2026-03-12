import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const usageSkills: Skill[] = [
  {
    id: 'usage-overview',
    name: 'View Usage Overview',
    description: 'Get usage summary for the project, optionally filtered by date range',
    category: 'usage',
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
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/usage${qs}`);
    },
  },
  {
    id: 'usage-logs',
    name: 'View Request Logs',
    description: 'Get detailed request-level logs with pagination',
    category: 'usage',
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
    parameters: [
      { name: 'requestId', type: 'string', description: 'The request ID to look up', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/requests/${params.requestId}`);
    },
  },
];
