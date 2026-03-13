import type { Skill, SkillContext, SkillResult } from '../types';

function nav(path: string, label: string, ctx: SkillContext): SkillResult {
  ctx.navigate(path);
  return { success: true, message: `Navigated to ${label}.`, navigateTo: path };
}

export const navigationSkills: Skill[] = [
  {
    id: 'nav-dashboard',
    name: 'Go to Dashboard',
    description: 'Navigate to the project dashboard/overview page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/dashboard`, 'Dashboard', ctx);
    },
  },
  {
    id: 'nav-keys',
    name: 'Go to API Keys',
    description: 'Navigate to the API keys management page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/keys`, 'API Keys', ctx);
    },
  },
  {
    id: 'nav-team',
    name: 'Go to Team',
    description: 'Navigate to the team/members management page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/team`, 'Team', ctx);
    },
  },
  {
    id: 'nav-billing',
    name: 'Go to Billing',
    description: 'Navigate to the billing overview page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/billing`, 'Billing', ctx);
    },
  },
  {
    id: 'nav-usage',
    name: 'Go to Usage',
    description: 'Navigate to the usage overview page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/usage`, 'Usage', ctx);
    },
  },
  {
    id: 'nav-usage-logs',
    name: 'Go to Usage Logs',
    description: 'Navigate to detailed request logs',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/usage/logs`, 'Usage Logs', ctx);
    },
  },
  {
    id: 'nav-billing-spend',
    name: 'Go to Spend Analysis',
    description: 'Navigate to the spend analysis page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/billing/spend`, 'Spend Analysis', ctx);
    },
  },
  {
    id: 'nav-billing-credits',
    name: 'Go to Credit History',
    description: 'Navigate to the credit history page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/billing/credit-history`, 'Credit History', ctx);
    },
  },
  {
    id: 'nav-billing-payment',
    name: 'Go to Payment Info',
    description: 'Navigate to payment method management',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/billing/payment-info`, 'Payment Info', ctx);
    },
  },
  {
    id: 'nav-settings',
    name: 'Go to User Settings',
    description: 'Navigate to user profile settings',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => nav('/settings', 'User Settings', ctx),
  },
  {
    id: 'nav-self-hosted',
    name: 'Go to Self-Hosted',
    description: 'Navigate to self-hosted/on-premises credentials page',
    category: 'navigation',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return nav(`/project/${ctx.projectId}/self-hosted`, 'Self-Hosted', ctx);
    },
  },
  {
    id: 'nav-page',
    name: 'Navigate to Page',
    description: 'Navigate to any console page by path',
    category: 'navigation',
    risk: 'safe',
    parameters: [
      { name: 'path', type: 'string', description: 'The URL path to navigate to', required: true },
    ],
    execute: async (params, ctx) => {
      const path = params.path as string;
      return nav(path, path, ctx);
    },
  },
];
