import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const teamSkills: Skill[] = [
  {
    id: 'team-list',
    name: 'List Team Members',
    description: 'List all members of the current project',
    category: 'team',
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
    description: 'Cancel a pending team invitation (destructive)',
    category: 'team',
    parameters: [
      { name: 'email', type: 'string', description: 'Email of the invitation to cancel', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/invites/${encodeURIComponent(params.email as string)}`);
    },
  },
  {
    id: 'team-remove',
    name: 'Remove Team Member',
    description: 'Remove a member from the project (destructive)',
    category: 'team',
    parameters: [
      { name: 'memberId', type: 'string', description: 'The member ID to remove', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/members/${params.memberId}`);
    },
  },
  {
    id: 'team-change-role',
    name: 'Change Member Role',
    description: 'Change a team member\'s role/permissions',
    category: 'team',
    parameters: [
      { name: 'memberId', type: 'string', description: 'The member ID to update', required: true },
      { name: 'scope', type: 'enum', description: 'New role for the member', required: true, enumValues: ['member', 'admin', 'owner'] },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'PUT', `/projects/${ctx.projectId}/members/${params.memberId}/scopes`, { scope: params.scope });
    },
  },
];
