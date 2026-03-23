import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const billingSkills: Skill[] = [
  {
    id: 'billing-balance',
    name: 'Check Balance',
    description: 'Get the current credit balance for the project',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/balances?format=detailed`);
      if (!res.success) return res;
      const balances = res.data as { balances: Array<{ balance_id: string; dollar_amount: number; preferred_units: string; expiration: string }> };
      const list = balances.balances.map((b) => `• $${b.dollar_amount.toFixed(2)} (${b.preferred_units}) — expires ${new Date(b.expiration).toLocaleDateString()}`).join('\n');
      return { success: true, message: `Balance:\n${list}`, data: balances };
    },
  },
  {
    id: 'billing-purchases',
    name: 'View Purchase History',
    description: 'Get the purchase/transaction history for the project',
    category: 'billing',
    risk: 'safe',
    parameters: [
      { name: 'page', type: 'number', description: 'Page number (default 1)', required: false },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const page = (params.page as number) || 1;
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/purchases?limit=10&page=${page}`);
    },
  },
  {
    id: 'billing-plan',
    name: 'View Current Plan',
    description: 'Get the current plan for the project',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/plan`);
    },
  },
  {
    id: 'billing-plans-available',
    name: 'List Available Plans',
    description: 'Show all available pricing plans',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      return apiCall(ctx, 'GET', '/plans');
    },
  },
  {
    id: 'billing-settings',
    name: 'View Billing Settings',
    description: 'Get billing settings including billing kind and contract status',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/billing/settings`);
    },
  },
  {
    id: 'billing-spend-breakdown',
    name: 'View Spend Breakdown',
    description: 'Get billing spend breakdown grouped by line item, tags, deployment, or accessor',
    category: 'billing',
    risk: 'safe',
    parameters: [
      { name: 'from', type: 'string', description: 'Start date (ISO 8601)', required: false },
      { name: 'to', type: 'string', description: 'End date (ISO 8601)', required: false },
      { name: 'groupBy', type: 'enum', description: 'Group spend data by', required: false, enumValues: ['line_item', 'tags', 'deployment', 'accessor'] },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const qp = new URLSearchParams();
      if (params.from) qp.set('from', params.from as string);
      if (params.to) qp.set('to', params.to as string);
      if (params.groupBy) qp.set('group_by', params.groupBy as string);
      const qs = qp.toString() ? `?${qp.toString()}` : '';
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/billing/breakdown${qs}`);
    },
  },
  {
    id: 'billing-spend-export',
    name: 'Export Spend CSV',
    description: 'Export billing spend breakdown data as CSV',
    category: 'billing',
    risk: 'safe',
    parameters: [
      { name: 'from', type: 'string', description: 'Start date (ISO 8601)', required: true },
      { name: 'to', type: 'string', description: 'End date (ISO 8601)', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'POST', `/projects/${ctx.projectId}/billing/export/breakdown`, {
        from: params.from,
        to: params.to,
      });
    },
  },
  {
    id: 'billing-auto-recharge-status',
    name: 'Check Auto-Recharge',
    description: 'Get auto-recharge settings for the project',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/auto-recharge`);
    },
  },
  {
    id: 'billing-auto-recharge-update',
    name: 'Update Auto-Recharge',
    description: 'Navigate to billing page where the user can configure auto-recharge settings',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/billing/overview`);
      return { success: true, message: 'Navigated to Billing. You can configure auto-recharge from here.', navigateTo: `/project/${ctx.projectId}/billing/overview` };
    },
  },
  {
    id: 'billing-auto-renew',
    name: 'Manage Auto-Renew',
    description: 'Navigate to billing page where the user can enable or disable automatic plan renewal',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/billing/overview`);
      return { success: true, message: 'Navigated to Billing. You can manage auto-renewal from here.', navigateTo: `/project/${ctx.projectId}/billing/overview` };
    },
  },
  {
    id: 'billing-payment-methods',
    name: 'List Payment Methods',
    description: 'List saved payment methods (credit/debit cards)',
    category: 'billing',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/stripe-payment-methods`);
    },
  },
  {
    id: 'billing-delete-payment-method',
    name: 'Delete Payment Method',
    description: 'Navigate to payment info page where the user can remove a payment method manually',
    category: 'billing',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/billing/payment-info`);
      return { success: true, message: 'Navigated to Payment Info. You can remove payment methods from there.', navigateTo: `/project/${ctx.projectId}/billing/payment-info` };
    },
  },
];
