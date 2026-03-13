import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const teamSkills: Skill[] = [
  {
    id: 'team-list',
    name: 'List Team Members',
    description: 'List all members of the current project',
    category: 'team',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/members`);
      if (!res.success) return res;
      const members = (res.data as { members: Array<{ member_id: string; email: string; first_name: string; last_name: string; scopes: string[] }> }).members;
      const list = members.map((m) => `• ${m.first_name} ${m.last_name} (${m.email}) — ${m.scopes?.join(', ')}`).join('\n');
      return { success: true, message: `${members.length} member(s):\n${list}`, data: members };
    },
  },
  {
    id: 'team-invite',
    name: 'Invite Team Member',
    description: 'Send an invitation to a new team member by email',
    category: 'team',
    risk: 'confirm',
    parameters: [
      { name: 'email', type: 'string', description: 'Email address to invite', required: true },
      { name: 'scope', type: 'enum', description: 'Role for the invited member', required: false, enumValues: ['member', 'admin', 'owner'] },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const body: Record<string, unknown> = { email: params.email };
      if (params.scope) body.scope = params.scope;
      return apiCall(ctx, 'POST', `/projects/${ctx.projectId}/invites`, body);
    },
  },
  {
    id: 'team-list-invites',
    name: 'List Pending Invites',
    description: 'List all pending team invitations',
    category: 'team',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/invites`);
      if (!res.success) return res;
      const invites = (res.data as { invites: Array<{ email: string; scope: string }> }).invites;
      if (invites.length === 0) return { success: true, message: 'No pending invitations.', data: invites };
      const list = invites.map((i) => `• ${i.email} (${i.scope})`).join('\n');
      return { success: true, message: `${invites.length} pending invite(s):\n${list}`, data: invites };
    },
  },
  {
    id: 'team-cancel-invite',
    name: 'Cancel Invitation',
    description: 'Navigate to team page where the user can revoke a pending invitation',
    category: 'team',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/team`);
      return { success: true, message: 'Navigated to Team. You can revoke invitations from there.', navigateTo: `/project/${ctx.projectId}/team` };
    },
  },
  {
    id: 'team-remove',
    name: 'Remove Team Member',
    description: 'Navigate to team page where the user can remove a member — this revokes their access immediately',
    category: 'team',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/team`);
      return { success: true, message: 'Navigated to Team. You can remove members from there.', navigateTo: `/project/${ctx.projectId}/team` };
    },
  },
  {
    id: 'team-change-role',
    name: 'Change Member Role',
    description: 'Change a team member\'s role/permissions',
    category: 'team',
    risk: 'confirm',
    parameters: [
      { name: 'memberId', type: 'string', description: 'The member ID to update', required: true },
      { name: 'scope', type: 'enum', description: 'New role for the member', required: true, enumValues: ['member', 'admin', 'owner'] },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'PUT', `/projects/${ctx.projectId}/members/${params.memberId}/scopes`, { scope: params.scope });
    },
  },
  {
    id: 'team-grant-scope',
    name: 'Grant Specific Scope',
    description: 'Grant a specific product scope to a team member (e.g. self-hosted access)',
    category: 'team',
    risk: 'confirm',
    parameters: [
      { name: 'memberId', type: 'string', description: 'The member ID to update', required: true },
      { name: 'scopeName', type: 'string', description: 'The scope name to grant (e.g. self-hosted:product)', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'PUT', `/projects/${ctx.projectId}/members/${params.memberId}/scopes/${encodeURIComponent(params.scopeName as string)}`);
    },
  },
];
