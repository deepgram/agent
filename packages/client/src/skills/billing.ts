import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const billingSkills: Skill[] = [
  {
    id: 'billing-balance',
    name: 'Check Balance',
    description: 'Get the current credit balance for the project',
    category: 'billing',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/balances?format=detailed`);
      if (!res.success) return res;
      const balances = res.data as { balances: Array<{ balance_id: string; amount: number; units: string }> };
      const list = balances.balances.map((b) => `• ${b.amount} ${b.units}`).join('\n');
      return { success: true, message: `Balance:\n${list}`, data: balances };
    },
  },
  {
    id: 'billing-purchases',
    name: 'View Purchase History',
    description: 'Get the purchase/transaction history for the project',
    category: 'billing',
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
    parameters: [],
    execute: async (_params, ctx) => {
      return apiCall(ctx, 'GET', '/plans');
    },
  },
  {
    id: 'billing-auto-recharge-status',
    name: 'Check Auto-Recharge',
    description: 'Get auto-recharge settings for the project',
    category: 'billing',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/auto-recharge`);
    },
  },
  {
    id: 'billing-auto-recharge-update',
    name: 'Update Auto-Recharge',
    description: 'Enable or configure auto-recharge settings',
    category: 'billing',
    parameters: [
      { name: 'enabled', type: 'boolean', description: 'Enable or disable auto-recharge', required: true },
      { name: 'threshold', type: 'number', description: 'Balance threshold to trigger recharge', required: false },
      { name: 'amount', type: 'number', description: 'Amount to recharge', required: false },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'PUT', `/projects/${ctx.projectId}/auto-recharge`, {
        enable: params.enabled,
        amount: params.amount,
        threshold: params.threshold,
      });
    },
  },
  {
    id: 'billing-auto-renew-enable',
    name: 'Enable Auto-Renew',
    description: 'Enable automatic plan renewal',
    category: 'billing',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'POST', `/projects/${ctx.projectId}/auto-renew`);
    },
  },
  {
    id: 'billing-auto-renew-disable',
    name: 'Disable Auto-Renew',
    description: 'Disable automatic plan renewal',
    category: 'billing',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/auto-renew`);
    },
  },
  {
    id: 'billing-payment-methods',
    name: 'List Payment Methods',
    description: 'List saved payment methods (credit/debit cards)',
    category: 'billing',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/stripe-payment-methods`);
    },
  },
  {
    id: 'billing-delete-payment-method',
    name: 'Delete Payment Method',
    description: 'Remove a saved payment method (destructive)',
    category: 'billing',
    parameters: [
      { name: 'methodId', type: 'string', description: 'The payment method ID to delete', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/stripe-payment-methods/${params.methodId}`);
    },
  },
];
